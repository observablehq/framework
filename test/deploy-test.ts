import assert, {fail} from "node:assert";
import {exec} from "node:child_process";
import type {Stats} from "node:fs";
import {stat} from "node:fs/promises";
import {Readable, Writable} from "node:stream";
import {promisify} from "node:util";
import type {BuildManifest} from "../src/build.js";
import {normalizeConfig, setCurrentDate} from "../src/config.js";
import type {DeployEffects, DeployOptions} from "../src/deploy.js";
import {deploy, promptDeployTarget} from "../src/deploy.js";
import {CliError, isHttpError} from "../src/error.js";
import {visitFiles} from "../src/files.js";
import type {ObservableApiClientOptions, PostDeployUploadedRequest} from "../src/observableApiClient.js";
import type {GetCurrentUserResponse} from "../src/observableApiClient.js";
import {ObservableApiClient} from "../src/observableApiClient.js";
import type {DeployConfig} from "../src/observableApiConfig.js";
import {stripColor} from "../src/tty.js";
import {MockAuthEffects} from "./mocks/authEffects.js";
import {TestClackEffects} from "./mocks/clack.js";
import {MockConfigEffects} from "./mocks/configEffects.js";
import {mockIsolatedDirectory} from "./mocks/directory.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";
import {MockLogger} from "./mocks/logger.js";
import {
  getCurrentObservableApi,
  invalidApiKey,
  mockObservableApi,
  userWithGuestMemberWorkspaces,
  userWithOneWorkspace,
  userWithTwoWorkspaces,
  userWithZeroWorkspaces,
  validApiKey
} from "./mocks/observableApi.js";

interface MockDeployEffectsOptions {
  apiKey?: string | null;
  deployConfig?: DeployConfig | null;
  isTty?: boolean;
  outputColumns?: number;
  debug?: boolean;
  fixedInputStatTime?: Date;
  fixedOutputStatTime?: Date;
  buildManifest?: BuildManifest;
}

class MockDeployEffects extends MockAuthEffects implements DeployEffects {
  public logger = new MockLogger();
  public input = new Readable();
  public output: NodeJS.WritableStream;
  public observableApiKey: string | null = null;
  public projectTitle = "My Project";
  public projectSlug = "my-project";
  public isTty: boolean;
  public outputColumns: number;
  public clack = new TestClackEffects();

  private deployConfigs: Record<string, DeployConfig>;
  private defaultDeployConfig: DeployConfig | null;
  private ioResponses: {prompt: RegExp; response: string}[] = [];
  private debug: boolean;
  private configEffects: MockConfigEffects;
  private authEffects: MockAuthEffects;
  private fixedInputStatTime: Date | undefined;
  private fixedOutputStatTime: Date | undefined;
  private buildManifest: BuildManifest | undefined;

  constructor({
    apiKey = validApiKey,
    deployConfig = null,
    isTty = true,
    outputColumns = 80,
    debug = false,
    fixedInputStatTime,
    fixedOutputStatTime,
    buildManifest
  }: MockDeployEffectsOptions = {}) {
    super();
    this.authEffects = new MockAuthEffects();
    this.configEffects = new MockConfigEffects();

    this.observableApiKey = apiKey;
    this.deployConfigs = {};
    this.defaultDeployConfig = deployConfig;
    this.isTty = isTty;
    this.outputColumns = outputColumns;
    this.debug = debug;
    this.fixedInputStatTime = fixedInputStatTime;
    this.fixedOutputStatTime = fixedOutputStatTime;
    this.buildManifest = buildManifest;

    this.output = new Writable({
      write: (data, _enc, callback) => {
        const dataString = data.toString();
        let matched = false;
        for (const [index, {prompt, response}] of this.ioResponses.entries()) {
          if (dataString.match(prompt)) {
            // Having to null/reinit input seems wrong.
            // TODO: find the correct way to submit to readline but keep the same
            // input stream across multiple readline interactions.
            this.input.push(`${response}\n`);
            this.input.push(null);
            this.input = new Readable();
            this.ioResponses.splice(index, 1);
            matched = true;
            break;
          }
        }
        if (!matched && debug) console.debug("Unmatched output:", dataString);
        callback();
      }
    });
  }

  private getDeployConfigKey(sourceRoot: string, deployConfigPath?: string): string {
    return `${sourceRoot}::${deployConfigPath ?? "<default>"}`;
  }

  async getDeployConfig(sourceRoot: string, deployConfigPath?: string): Promise<DeployConfig> {
    const key = this.getDeployConfigKey(sourceRoot, deployConfigPath);
    return (
      this.deployConfigs[key] ??
      this.defaultDeployConfig ??
      ({projectId: null, projectSlug: null, workspaceLogin: null, continuousDeployment: null} satisfies DeployConfig)
    );
  }

  async setDeployConfig(sourceRoot: string, deployConfigPath: string | undefined, config: DeployConfig) {
    const key = this.getDeployConfigKey(sourceRoot, deployConfigPath);
    this.deployConfigs[key] = config;
  }

  *visitFiles(path: string) {
    yield* visitFiles(path);
  }

  async stat(path: string) {
    function overrideTime(s: Stats, date: Date) {
      for (const key of ["a", "c", "m", "birth"] as const) {
        s[`${key}time`] = date;
        s[`${key}timeMs`] = date.getTime();
      }
    }
    const s = await stat(path);
    if (path.startsWith("test/input/") && this.fixedInputStatTime) {
      overrideTime(s, this.fixedInputStatTime);
    } else if (path.startsWith("test/output/") && this.fixedOutputStatTime) {
      overrideTime(s, this.fixedOutputStatTime);
    }
    return s;
  }

  async build(): Promise<void> {
    // Don't actually build.
  }

  addIoResponse(prompt: RegExp, response: string) {
    this.ioResponses.push({prompt, response});
    return this;
  }

  close() {
    assert.deepEqual(this.ioResponses, []);
  }

  makeApiClient() {
    const opts: ObservableApiClientOptions = {clack: this.clack};
    if (this.observableApiKey) opts.apiKey = {key: this.observableApiKey, source: "test"};
    return new ObservableApiClient(opts);
  }

  readCacheFile(sourceRoot: string, path: string): Promise<string> {
    if (path === "_build.json") {
      if (this.buildManifest) return Promise.resolve(JSON.stringify(this.buildManifest));
      throw Object.assign(new Error("no build manifest configured for this test"), {code: "ENOENT"});
    }
    throw Object.assign(new Error("non-manifest cache files aren't available in tests"), {code: "ENOENT"});
  }
}

// This test should have exactly one index.md in it, and nothing else; that one
// page is why we +1 to the number of extra files.
const TEST_SOURCE_ROOT = "test/input/build/simple-public";
const TEST_CONFIG = normalizeConfig({
  root: TEST_SOURCE_ROOT,
  output: "test/output/build/simple-public",
  title: "Build test case"
});
const TEST_OPTIONS: DeployOptions = {
  config: TEST_CONFIG,
  message: undefined,
  deployPollInterval: 0,
  force: "deploy", // default to not re-building and just deploying output as-is
  deployConfigPath: undefined
};
const DEPLOY_CONFIG: DeployConfig & {projectId: string; projectSlug: string; workspaceLogin: string} = {
  projectId: "project123",
  projectSlug: "bi",
  workspaceLogin: "mock-user-ws",
  continuousDeployment: false
};

describe("deploy", () => {
  before(() => setCurrentDate(new Date("2024-01-10T16:00:00")));
  mockObservableApi();
  mockJsDelivr();

  describe("in isolated directory with git repo", () => {
    mockIsolatedDirectory({git: true});

    it("fails continuous deployment if repo has no GitHub remote", async () => {
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetWorkspaceProjects({
          workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
          projects: []
        })
        .handlePostProject({projectId: DEPLOY_CONFIG.projectId, slug: DEPLOY_CONFIG.projectSlug})
        .start();
      const effects = new MockDeployEffects();
      effects.clack.inputs.push(
        true, // No apps found. Do you want to create a new app?
        DEPLOY_CONFIG.projectSlug, // What slug do you want to use?
        "public", // Who is allowed to access your app?
        true // Do you want to enable continuous deployment?
      );

      try {
        await deploy(TEST_OPTIONS, effects);
        assert.fail("expected error");
      } catch (error) {
        CliError.assert(error, {message: "No GitHub remote found."});
      }

      effects.close();
    });

    it("starts cloud build when continuous deployment is enabled and repo is valid", async () => {
      const deployId = "deploy123";
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetWorkspaceProjects({
          workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
          projects: []
        })
        .handlePostProject({projectId: DEPLOY_CONFIG.projectId, slug: DEPLOY_CONFIG.projectSlug})
        .handleGetRepository()
        .handlePostProjectEnvironment()
        .handlePostProjectBuild()
        .handleGetProject({...DEPLOY_CONFIG, latestCreatedDeployId: deployId})
        .handleGetDeploy({deployId, deployStatus: "uploaded"})
        .start();
      const effects = new MockDeployEffects();
      effects.clack.inputs.push(
        true, // No apps found. Do you want to create a new app?
        DEPLOY_CONFIG.projectSlug, // What slug do you want to use?
        "public", // Who is allowed to access your app?
        true // Do you want to enable continuous deployment?
      );

      const {stdout, stderr} = await promisify(exec)(
        "touch readme.md && git add . && git commit -m 'initial' && git remote add origin git@github.com:observablehq/test.git"
      );
      console.log("starts cloud build test", {stdout, stderr});

      await deploy(TEST_OPTIONS, effects);

      effects.close();
    });

    it("starts cloud build when continuous deployment is enabled for existing project with existing source", async () => {
      const deployId = "deploy123";
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          source: {
            provider: "github",
            provider_id: "123:456",
            url: "https://github.com/observablehq/test.git",
            branch: "main"
          },
          latestCreatedDeployId: null
        })
        .handleGetRepository({useProviderId: true})
        .handlePostProjectBuild()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          source: {
            provider: "github",
            provider_id: "123:456",
            url: "https://github.com/observablehq/test.git",
            branch: "main"
          },
          latestCreatedDeployId: deployId
        })
        .handleGetDeploy({deployId, deployStatus: "uploaded"})
        .start();
      const effects = new MockDeployEffects({deployConfig: {...DEPLOY_CONFIG, continuousDeployment: true}});
      effects.clack.inputs.push(
        "bi" // Which app do you want to use?
      );

      await promisify(exec)(
        "touch readme.md; git add .; git commit -m 'initial'; git remote add origin https://github.com/observablehq/test.git"
      );

      await deploy(TEST_OPTIONS, effects);

      effects.close();
    });
  });

  describe("in isolated directory without git repo", () => {
    mockIsolatedDirectory({git: false});

    it("fails continuous deployment if not in a git repo", async () => {
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetWorkspaceProjects({
          workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
          projects: []
        })
        .handlePostProject({projectId: DEPLOY_CONFIG.projectId})
        .start();
      const effects = new MockDeployEffects();
      effects.clack.inputs.push(
        true, // No apps found. Do you want to create a new app?
        DEPLOY_CONFIG.projectSlug, // What slug do you want to use?
        "public", // Who is allowed to access your app?
        true // Do you want to enable continuous deployment?
      );

      try {
        await deploy(TEST_OPTIONS, effects);
        assert.fail("expected error");
      } catch (error) {
        CliError.assert(error, {message: "Not at root of a git repository."});
      }

      effects.close();
    });
  });

  it("makes expected API calls for an existing project", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("makes expected API calls for an existing project and deploy", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetDeploy({deployId, deployStatus: "created"})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"
    await deploy({...TEST_OPTIONS, deployId}, effects);

    effects.close();
  });

  it("won't deploy to a non-existent deploy", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi().handleGetCurrentUser().handleGetDeploy({deployId, status: 404}).start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"

    try {
      await deploy({...TEST_OPTIONS, deployId}, effects);
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: "Deploy deploy456 not found.", print: true, exitCode: 1});
    }

    effects.close();
  });

  it("won't deploy to an existing deploy with an unexpected status", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi().handleGetCurrentUser().handleGetDeploy({deployId, deployStatus: "uploaded"}).start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"

    try {
      await deploy({...TEST_OPTIONS, deployId}, effects);
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {
        message: "Deploy deploy456 has an unexpected status: uploaded",
        print: true,
        exitCode: 1
      });
    }

    effects.close();
  });

  it("updates title for existing project if it doesn't match", async () => {
    const deployId = "deploy456";
    const oldTitle = `${TEST_CONFIG.title!} old`;
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({...DEPLOY_CONFIG, title: oldTitle})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs.push("change project title"); // "what changed?"
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("updates title if needed when deploy config doesn't exist but the project does", async () => {
    const deployId = "deploy456";
    const oldTitle = `${TEST_CONFIG.title!} old`;
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetWorkspaceProjects({
        workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
        projects: [{id: DEPLOY_CONFIG.projectId, slug: DEPLOY_CONFIG.projectSlug, title: oldTitle}]
      })
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: null,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs.push(
      DEPLOY_CONFIG.projectSlug, // which project do you want to use?
      true, // Do you want to continue? (and overwrite the project)
      false, // Do you want to enable continuous deployment?
      "change project title" // "what changed?"
    );
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("does not prompt for a message when one is supplied on the command line", async () => {
    const deployConfig = DEPLOY_CONFIG;
    const deployId = "deploy456";
    const message = "this is test deploy";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(deployConfig)
      .handlePostDeploy({projectId: deployConfig.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    // no io response for message
    const effects = new MockDeployEffects({deployConfig});
    await deploy({...TEST_OPTIONS, message}, effects);

    effects.close();
  });

  it("makes expected API calls for non-existent project, user chooses to create", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .handleGetWorkspaceProjects({
        workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
        projects: [{id: DEPLOY_CONFIG.projectId, slug: DEPLOY_CONFIG.projectSlug}]
      })
      .handlePostProject({projectId: DEPLOY_CONFIG.projectId})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: true});
    effects.clack.inputs.push(null, DEPLOY_CONFIG.projectSlug, "private", "fix some bugs");

    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("makes expected API calls for configured, non-existent project; user chooses not to create", async () => {
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetWorkspaceProjects({workspaceLogin: DEPLOY_CONFIG.workspaceLogin, projects: []})
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: true});
    effects.clack.inputs.push(false);

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: "User canceled deploy.", print: false, exitCode: 0});
    }

    effects.close();
  });

  it("makes expected API calls for configured, non-existent project; non-interactive", async () => {
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .start();
    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: false});

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: "Deploy not configured."});
    }

    effects.close();
  });

  it("prompts for title when a deploy target is configured, project doesn't exist, and config has no title", async () => {
    const config = normalizeConfig({
      root: TEST_SOURCE_ROOT
      // no title!
    });
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetWorkspaceProjects({workspaceLogin: DEPLOY_CONFIG.workspaceLogin, projects: []})
      .start();
    const effects = new MockDeployEffects({deployConfig: null, isTty: true});
    effects.clack.inputs.push(true);

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      assert.ok(err instanceof Error && err.message.match(/What title do you want to use/));
    }

    effects.close();
  });

  it("throws an error if project doesn't exist and workspace doesn't exist", async () => {
    const deployConfig = DEPLOY_CONFIG;
    const config = normalizeConfig({
      root: TEST_SOURCE_ROOT,
      title: "Some title"
    });
    getCurrentObservableApi()
      .handleGetCurrentUser({user: userWithZeroWorkspaces})
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .start();

    const effects = new MockDeployEffects({deployConfig, isTty: true});

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: /No Observable workspace found/, print: false});
    }
    effects.clack.log.assertLogged({
      message: /You don’t have any Observable workspaces.*https:\/\/observablehq.com/,
      level: "error"
    });

    effects.close();
  });

  it("throws an error if workspace is invalid", async () => {
    const config = normalizeConfig({root: TEST_SOURCE_ROOT});
    const deployConfig = {
      ...DEPLOY_CONFIG,
      workspaceLogin: "ACME Inc."
    };
    getCurrentObservableApi().handleGetCurrentUser().start();
    const effects = new MockDeployEffects({deployConfig, isTty: true});

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: /Found invalid workspace login.*ACME Inc./});
    }

    effects.close();
  });

  it("throws an error if project is invalid", async () => {
    const config = normalizeConfig({
      root: TEST_SOURCE_ROOT
    });
    const deployConfig = {
      ...DEPLOY_CONFIG,
      projectSlug: "Business Intelligence"
    };
    getCurrentObservableApi().handleGetCurrentUser().start();
    const effects = new MockDeployEffects({deployConfig, isTty: true});

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: /Found invalid `projectSlug`.*Business Intelligence/});
    }

    effects.close();
  });

  it("shows message for missing API key", async () => {
    const effects = new MockDeployEffects({apiKey: null});

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (error) {
      assert.ok(error instanceof Error, `error should be an Error (got ${typeof error})`);
      assert.match(error.message, /^out of inputs for select: You must be logged in/);
    }
  });

  it("Prompts the user to log in when they get a 401 response from the server", async () => {
    getCurrentObservableApi().handleGetCurrentUser({status: 401}).start();
    const effects = new MockDeployEffects({apiKey: invalidApiKey});

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(error instanceof Error, `error should be an Error (got ${typeof error})`);
      assert.match(error.message, /^out of inputs for select: You must be logged in/);
    }
  });

  it("Prompts the user to log in when they get a 403 response from the server", async () => {
    getCurrentObservableApi().handleGetCurrentUser({status: 403}).start();
    const effects = new MockDeployEffects({apiKey: invalidApiKey});

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(error instanceof Error, `error should be an Error (got ${typeof error})`);
      assert.match(error.message, /^out of inputs for select: Your authentication is invalid/);
    }
  });

  it("non interactive terminals throw an error when unauthenticated", async () => {
    const effects = new MockDeployEffects({isTty: false, apiKey: null});
    await assert.rejects(
      async () => await deploy(TEST_OPTIONS, effects),
      (error) => (CliError.assert(error, {message: "No authentication provided"}), true)
    );
  });

  it("non interactive terminals throw an error when unauthorized", async () => {
    getCurrentObservableApi().handleGetCurrentUser({status: 403}).start();
    const effects = new MockDeployEffects({isTty: false, apiKey: invalidApiKey});
    await assert.rejects(
      async () => await deploy(TEST_OPTIONS, effects),
      (error) => (CliError.assert(error, {message: "Authentication was rejected by the server: forbidden"}), true)
    );
  });

  it("throws an error if deploy creation fails", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({...DEPLOY_CONFIG})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId, status: 500})
      .start();
    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs.push("fix some bugs");

    try {
      await deploy(TEST_OPTIONS, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(
        isHttpError(error),
        `expected HttpError, got ${error instanceof Error ? `${error.message}\n${error?.stack}` : error}`
      );
      assert.equal(error.statusCode, 500);
    }

    effects.close();
  });

  it("throws an error if file upload fails", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployManifest({deployId, files: [{deployId, path: "index.html", action: "upload"}]})
      .handlePostDeployFile({deployId, status: 500})
      .start();
    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs.push("fix some more bugs");

    try {
      await deploy({...TEST_OPTIONS, maxConcurrency: 1}, effects);
      fail("Should have thrown an error");
    } catch (error) {
      CliError.assert(error, {message: /While uploading index.html.*500/});
      assert.ok(isHttpError(error.cause));
      assert.equal(error.cause.statusCode, 500);
    }

    effects.close();
  });

  it("throws an error if deploy uploaded fails", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId, status: 500})
      .start();
    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs.push("fix some bugs");

    try {
      await deploy(TEST_OPTIONS, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    effects.close();
  });

  it("prompts to create when a deploy target is not configured", async () => {
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetWorkspaceProjects({workspaceLogin: "mock-user-ws", projects: []})
      .start();
    const config = {...TEST_CONFIG, deploy: null};
    const effects = new MockDeployEffects();
    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      assert.ok(err instanceof Error && err.message.match(/out of inputs for.*Do you want to create a new app/));
    }
  });

  it("gives nice errors when a starter tier workspace tries to deploy a second project", async () => {
    const workspace = userWithOneWorkspace.workspaces[0];
    getCurrentObservableApi()
      .handleGetCurrentUser({user: userWithOneWorkspace})
      .handleGetWorkspaceProjects({workspaceLogin: workspace.login, projects: [{id: "project123", slug: "bi"}]})
      .addHandler((pool) => {
        pool.intercept({path: "/cli/project", method: "POST"}).reply(403, {errors: [{code: "TOO_MANY_PROJECTS"}]});
      })
      .start();
    const effects = new MockDeployEffects();
    effects.clack.inputs.push(null); // which project do you want to use?
    effects.clack.inputs.push("test-project"); // which slug do you want to use?
    effects.clack.inputs.push("private"); // who is allowed to access your project?
    effects.clack.inputs.push("something new"); // what changed in this deploy?

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: "Error during deploy", print: false});
    }
    effects.clack.log.assertLogged({message: /Starter tier can only deploy one app/, level: "error"});
  });

  it("gives a nice error when there are no workspaces to deploy to", async () => {
    getCurrentObservableApi().handleGetCurrentUser({user: userWithZeroWorkspaces}).start();
    const effects = new MockDeployEffects();
    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: "No Observable workspace found.", print: false});
    }
    effects.clack.log.assertLogged({level: "error", message: /You don’t have any Observable workspaces/});
  });

  it("allows choosing between two workspaces when creating", async () => {
    getCurrentObservableApi().handleGetCurrentUser({user: userWithTwoWorkspaces}).start();
    const effects = new MockDeployEffects();
    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.match(err.message, /out of inputs for select.*Which Observable workspace do you want to use/);
    }
  });

  it("filters out workspace with the wrong tier or wrong role", async () => {
    getCurrentObservableApi().handleGetCurrentUser({user: userWithGuestMemberWorkspaces}).start();
    const effects = new MockDeployEffects();
    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.match(err.message, /out of inputs for select.*Which Observable workspace do you want to use/);
      assert.ok("options" in err && Array.isArray(err.options) && err.options.length === 3);
      assert.ok("options" in err && Array.isArray(err.options) && err.options[0].value.role === "owner");
      assert.ok("options" in err && Array.isArray(err.options) && err.options[1].value.role === "member");
      assert.ok(
        "options" in err &&
          Array.isArray(err.options) &&
          err.options[2].value.role === "guest_member" &&
          err.options[2].value.projects_info.some((info) => info.project_role === "editor")
      );
    }
  });

  it("includes a build manifest if one was generated", async () => {
    const deployId = "deploy456";
    let buildManifestPages: PostDeployUploadedRequest["pages"] | null = null;
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({
        deployId,
        pageMatch: (pages) => {
          buildManifestPages = pages;
          return true;
        }
      })
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10"),
      buildManifest: {pages: [{path: "/", title: "Build test case"}]}
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"
    await deploy(TEST_OPTIONS, effects);

    assert.deepEqual(buildManifestPages, [{path: "/", title: "Build test case"}]);

    effects.close();
  });

  describe("when deploy state doesn't match", () => {
    it("interactive, when the user chooses to update", async () => {
      const newProjectId = "newProjectId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      const deployId = "deployId";
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({...DEPLOY_CONFIG, projectId: newProjectId})
        .handlePostDeploy({projectId: newProjectId, deployId})
        .expectStandardFiles({deployId})
        .handlePostDeployUploaded({deployId})
        .handleGetDeploy({deployId})
        .start();
      const effects = new MockDeployEffects({deployConfig: oldDeployConfig, isTty: true});
      effects.clack.inputs.push(true, "recreate project");
      await deploy(TEST_OPTIONS, effects);
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json does not match/});
      effects.close();
    });

    it("interactive, when the user chooses not to update", async () => {
      const newProjectId = "newId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({...DEPLOY_CONFIG, projectId: newProjectId})
        .start();
      const effects = new MockDeployEffects({deployConfig: oldDeployConfig, isTty: true});
      effects.clack.inputs.push(false); // State doesn't match do you want to continue deploying?
      try {
        await deploy(TEST_OPTIONS, effects);
        assert.fail("expected error");
      } catch (error) {
        CliError.assert(error, {message: "User canceled deploy", print: false, exitCode: 0});
      }
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json does not match/});
      effects.close();
    });

    it("when non-interactive", async () => {
      const newProjectId = "newId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          projectId: newProjectId
        })
        .start();
      const effects = new MockDeployEffects({deployConfig: oldDeployConfig, isTty: false, debug: true});
      try {
        await deploy(TEST_OPTIONS, effects);
        assert.fail("expected error");
      } catch (error) {
        CliError.assert(error, {message: "Cancelling deploy due to misconfiguration."});
      }
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json does not match/});
    });

    it("missing project id and existing server project", async () => {
      const newProjectId = "newProjectId";
      const deployConfig: DeployConfig = {...DEPLOY_CONFIG};
      delete deployConfig.projectId;
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          projectId: newProjectId
        })
        .start();
      const effects = new MockDeployEffects({deployConfig, isTty: true});
      effects.clack.inputs.push(false);
      try {
        await deploy(TEST_OPTIONS, effects);
      } catch (error) {
        CliError.assert(error, {message: "User canceled deploy", print: false, exitCode: 0});
      }
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json is missing.*will overwrite/});
      effects.close();
    });
  });

  it("can log in and deploy", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handlePostAuthRequest()
      .handlePostAuthRequestPoll("accepted")
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, apiKey: null});
    effects.clack.inputs = [
      true, // do you want to log in?
      "fix some bugs" // deploy message
    ];
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("will re-poll for both created and pending deploy statuses", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId, deployStatus: "created"})
      .handleGetDeploy({deployId, deployStatus: "pending"})
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs = [
      true, // do you want to log in?
      "fix some bugs" // deploy message
    ];
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("prompts if the build doesn't exist", async () => {
    const deployOptions = {
      ...TEST_OPTIONS,
      force: null,
      config: {...TEST_OPTIONS.config, output: "test/output/does-not-exist"}
    } satisfies DeployOptions;
    getCurrentObservableApi().handleGetCurrentUser().handleGetProject(DEPLOY_CONFIG).start();
    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    await assert.rejects(() => deploy(deployOptions, effects), /out of inputs for select: No build files/);
    effects.close();
  });

  it("prompts if the build is stale", async () => {
    const deployOptions = {
      ...TEST_OPTIONS,
      force: null
    } satisfies DeployOptions;
    getCurrentObservableApi().handleGetCurrentUser().handleGetProject(DEPLOY_CONFIG).start();
    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    await assert.rejects(
      () => deploy(deployOptions, effects),
      /out of inputs for select: Would you like to build again/
    );
    effects.close();
  });

  it("prompts if build is older than source", async () => {
    const deployOptions = {
      ...TEST_OPTIONS,
      force: null
    } satisfies DeployOptions;
    getCurrentObservableApi().handleGetCurrentUser().handleGetProject(DEPLOY_CONFIG).start();
    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-11"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    await assert.rejects(
      () => deploy(deployOptions, effects),
      /out of inputs for select: Would you like to build again/
    );
    effects.close();
  });

  it("can force a build", async () => {
    const deployOptions = {
      ...TEST_OPTIONS,
      force: "build"
    } satisfies DeployOptions;
    getCurrentObservableApi().handleGetCurrentUser().handleGetProject(DEPLOY_CONFIG).start();
    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.build = async () => {
      // Change our no-op test build() to throw, so we can verify it ran.
      throw new Error("build() was called");
    };
    try {
      await deploy(deployOptions, effects);
      fail("build() was never called");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "build() was called") {
        throw error;
      }
    }
    effects.close();
  });

  it("can force a deploy", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectStandardFiles({deployId})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const deployOptions = {
      ...TEST_OPTIONS,
      force: "deploy"
    } satisfies DeployOptions;

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-11"), // newer source files
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = [
      true, // do you want to log in?
      "fix some bugs" // deploy message
    ];

    await deploy(deployOptions, effects);

    effects.close();
  });

  it("will skip file uploads if instructed by the server", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .expectFileUpload({deployId, path: "index.html", action: "upload"})
      .expectFileUpload({deployId, path: "_observablehq/client.00000001.js", action: "skip"})
      .expectFileUpload({deployId, path: "_observablehq/runtime.00000002.js", action: "skip"})
      .expectFileUpload({deployId, path: "_observablehq/stdlib.00000003.js", action: "skip"})
      .expectFileUpload({deployId, path: "_observablehq/theme-air,near-midnight.00000004.css", action: "skip"})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({
      deployConfig: DEPLOY_CONFIG,
      fixedInputStatTime: new Date("2024-03-09"),
      fixedOutputStatTime: new Date("2024-03-10")
    });
    effects.clack.inputs = ["fix some bugs"]; // "what changed?"
    await deploy(TEST_OPTIONS, effects);

    effects.close();

    // first is the upload spinner, second is the server processing spinner
    assert.equal(effects.clack.spinners.length, 2, JSON.stringify(effects.clack.spinners, null, 2));
    const events = effects.clack.spinners[0]._events.map((e) => {
      const r: {method: string; message?: string} = {method: e.method};
      if (e.message) r.message = stripColor(e.message);
      return r;
    });
    assert.deepEqual(events, [
      {method: "start"},
      {method: "message", message: "Hashing local files"},
      {method: "message", message: "Sending file manifest to server"},
      {method: "message", message: "1 / 1 uploading index.html"},
      {method: "stop", message: "1 uploaded, 4 unchanged, 5 total."}
    ]);
  });
});

describe("promptDeployTarget", () => {
  mockObservableApi();

  it("throws when not on a tty", async () => {
    const effects = new MockDeployEffects({isTty: false});
    const api = effects.makeApiClient();
    try {
      await promptDeployTarget(effects, TEST_CONFIG, api, {} as GetCurrentUserResponse);
    } catch (error) {
      CliError.assert(error, {message: "Deploy not configured."});
    }
  });

  it("throws an error when the user has no workspaces", async () => {
    const effects = new MockDeployEffects();
    const api = effects.makeApiClient();
    try {
      await promptDeployTarget(effects, TEST_CONFIG, api, userWithZeroWorkspaces);
    } catch (error) {
      effects.clack.log.assertLogged({message: /You don’t have any Observable workspaces/});
      CliError.assert(error, {message: "No Observable workspace found.", print: false});
    }
  });

  it("handles a user with multiple workspaces", async () => {
    const effects = new MockDeployEffects();
    const workspace = userWithTwoWorkspaces.workspaces[1];
    const projectSlug = "new-project";
    const accessLevel = "private";
    effects.clack.inputs = [
      workspace, // which workspace do you want to use?
      true, //
      projectSlug, // what slug do you want to use
      accessLevel // who is allowed to access your project?
    ];
    const api = effects.makeApiClient();
    getCurrentObservableApi().handleGetWorkspaceProjects({workspaceLogin: workspace.login, projects: []}).start();
    const result = await promptDeployTarget(effects, TEST_CONFIG, api, userWithTwoWorkspaces);
    assert.deepEqual(result, {
      accessLevel,
      create: true,
      projectSlug,
      title: "Build test case",
      workspace
    });
  });
});
