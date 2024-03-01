import assert, {fail} from "node:assert";
import {Readable, Writable} from "node:stream";
import {normalizeConfig} from "../src/config.js";
import {type DeployEffects, type DeployOptions, deploy, promptDeployTarget} from "../src/deploy.js";
import {CliError, isHttpError} from "../src/error.js";
import {type GetCurrentUserResponse, ObservableApiClient} from "../src/observableApiClient.js";
import type {DeployConfig} from "../src/observableApiConfig.js";
import {TestClackEffects} from "./mocks/clack.js";
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
import {MockAuthEffects} from "./observableApiAuth-test.js";
import {MockConfigEffects} from "./observableApiConfig-test.js";

interface MockDeployEffectsOptions {
  apiKey?: string | null;
  deployConfig?: DeployConfig | null;
  isTty?: boolean;
  outputColumns?: number;
  debug?: boolean;
}

class MockDeployEffects extends MockAuthEffects implements DeployEffects {
  public logger = new MockLogger();
  public input = new Readable();
  public output: NodeJS.WritableStream;
  public observableApiKey: string | null = null;
  public deployConfig: DeployConfig | null = null;
  public projectTitle = "My Project";
  public projectSlug = "my-project";
  public isTty: boolean;
  public outputColumns: number;
  public clack = new TestClackEffects();

  private ioResponses: {prompt: RegExp; response: string}[] = [];
  private debug: boolean;
  private configEffects: MockConfigEffects;
  private authEffects: MockAuthEffects;

  constructor({
    apiKey = validApiKey,
    deployConfig = null,
    isTty = true,
    outputColumns = 80,
    debug = false
  }: MockDeployEffectsOptions = {}) {
    super();
    this.authEffects = new MockAuthEffects();
    this.configEffects = new MockConfigEffects();

    this.observableApiKey = apiKey;
    this.deployConfig = deployConfig;
    this.isTty = isTty;
    this.outputColumns = outputColumns;
    this.debug = debug;

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

  async getDeployConfig(): Promise<DeployConfig> {
    return this.deployConfig ?? {projectId: null, projectSlug: null, workspaceLogin: null};
  }

  async setDeployConfig(sourceRoot: string, config: DeployConfig) {
    this.deployConfig = config;
  }

  addIoResponse(prompt: RegExp, response: string) {
    this.ioResponses.push({prompt, response});
    return this;
  }

  close() {
    assert.deepEqual(this.ioResponses, []);
  }
}

// This test should have exactly one index.md in it, and nothing else; that one
// page is why we +1 to the number of extra files.
const TEST_SOURCE_ROOT = "test/input/build/simple-public";
const TEST_CONFIG = await normalizeConfig({
  root: TEST_SOURCE_ROOT,
  title: "Mock BI"
});
const TEST_OPTIONS: DeployOptions = {config: TEST_CONFIG, message: undefined, deployPollInterval: 0};
const DEPLOY_CONFIG: DeployConfig & {projectId: string; projectSlug: string; workspaceLogin: string} = {
  projectId: "project123",
  projectSlug: "bi",
  workspaceLogin: "mock-user-ws"
};

describe("deploy", () => {
  mockObservableApi();
  mockJsDelivr();

  it("makes expected API calls for an existing project", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId, deployStatus: "uploaded"})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs = ["fix some bugs"];
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("updates title for existing project if it doesn't match", async () => {
    const deployId = "deploy456";
    const oldTitle = `${TEST_CONFIG.title!} old`;
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({...DEPLOY_CONFIG, title: oldTitle})
      .handleUpdateProject({projectId: DEPLOY_CONFIG.projectId, title: TEST_CONFIG.title!})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs.push("change project title");
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
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
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
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
      .handlePostDeployUploaded({deployId})
      .handleGetDeploy({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: true});
    effects.clack.inputs.push(null, DEPLOY_CONFIG.projectSlug, "fix some bugs");

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
    const config = await normalizeConfig({
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
    const config = await normalizeConfig({
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
    const config = await normalizeConfig({root: TEST_SOURCE_ROOT});
    const deployConfig = {
      ...DEPLOY_CONFIG,
      workspaceLogin: "ACME Inc."
    };
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
    const config = await normalizeConfig({
      root: TEST_SOURCE_ROOT
    });
    const deployConfig = {
      ...DEPLOY_CONFIG,
      projectSlug: "Business Intelligence"
    };
    const effects = new MockDeployEffects({deployConfig, isTty: true});

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: /Found invalid project slug.*Business Intelligence/});
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

  it("throws an error if deploy creation fails", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject({
        ...DEPLOY_CONFIG
      })
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
      .handlePostDeployFile({deployId, status: 500})
      .start();
    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs.push("fix some more bugs");

    try {
      await deploy(TEST_OPTIONS, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    effects.close();
  });

  it("throws an error if deploy uploaded fails", async () => {
    const deployId = "deploy456";
    getCurrentObservableApi()
      .handleGetCurrentUser()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
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
      assert.ok(err instanceof Error && err.message.match(/out of inputs for.*Do you want to create a new project/));
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

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: "Error during deploy", print: false});
    }
    effects.clack.log.assertLogged({message: /Starter tier can only deploy one project/, level: "error"});
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

  describe("when deploy state doesn't match", () => {
    it("interactive, when the user chooses to update", async () => {
      const newProjectId = "newProjectId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      const deployId = "deployId";
      getCurrentObservableApi()
        .handleGetCurrentUser()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          projectId: newProjectId
        })
        .handlePostDeploy({projectId: newProjectId, deployId})
        .handlePostDeployFile({deployId, clientName: "index.html"})
        .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
        .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
        .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
        .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
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
        .handleGetProject({
          ...DEPLOY_CONFIG,
          projectId: newProjectId
        })
        .start();
      const effects = new MockDeployEffects({deployConfig: oldDeployConfig, isTty: true});
      effects.clack.inputs.push(false);
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
      .handlePostDeployFile({deployId, clientName: "index.html"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/theme-air,near-midnight.css"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/client.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/runtime.js"})
      .handlePostDeployFile({deployId, clientName: "_observablehq/stdlib.js"})
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
});

describe("promptDeployTarget", () => {
  mockObservableApi();

  it("throws when not on a tty", async () => {
    const effects = new MockDeployEffects({isTty: false});
    const api = new ObservableApiClient({apiKey: {key: validApiKey, source: "test"}});
    try {
      await promptDeployTarget(effects, api, TEST_CONFIG, {} as GetCurrentUserResponse);
    } catch (error) {
      CliError.assert(error, {message: "Deploy not configured."});
    }
  });

  it("throws an error when the user has no workspaces", async () => {
    const effects = new MockDeployEffects();
    const api = new ObservableApiClient({apiKey: {key: validApiKey, source: "test"}});
    try {
      await promptDeployTarget(effects, api, TEST_CONFIG, userWithZeroWorkspaces);
    } catch (error) {
      effects.clack.log.assertLogged({message: /You don’t have any Observable workspaces/});
      CliError.assert(error, {message: "No Observable workspace found.", print: false});
    }
  });

  it("handles a user with multiple workspaces", async () => {
    const effects = new MockDeployEffects();
    const workspace = userWithTwoWorkspaces.workspaces[1];
    const projectSlug = "new-project";
    effects.clack.inputs = [
      workspace, // which workspace do you want to use?
      true, //
      projectSlug // what slug do you want to use
    ];
    const api = new ObservableApiClient({apiKey: {key: validApiKey, source: "test"}});
    getCurrentObservableApi().handleGetWorkspaceProjects({workspaceLogin: workspace.login, projects: []}).start();
    const result = await promptDeployTarget(effects, api, TEST_CONFIG, userWithTwoWorkspaces);
    assert.deepEqual(result, {
      create: true,
      projectSlug,
      title: "Mock BI",
      workspace
    });
  });
});
