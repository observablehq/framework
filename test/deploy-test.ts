import assert, {fail} from "node:assert";
import {Readable, Writable} from "node:stream";
import {commandRequiresAuthenticationMessage} from "../src/commandInstruction.js";
import {normalizeConfig} from "../src/config.js";
import type {DeployEffects} from "../src/deploy.js";
import {deploy} from "../src/deploy.js";
import {CliError, isHttpError} from "../src/error.js";
import type {DeployConfig} from "../src/observableApiConfig.js";
import {TestClackEffects} from "./mocks/clack.js";
import {MockLogger} from "./mocks/logger.js";
import {getCurentObservableApi, mockObservableApi} from "./mocks/observableApi.js";
import {invalidApiKey, validApiKey} from "./mocks/observableApi.js";
import {MockConfigEffects} from "./observableApiConfig-test.js";

// These files are implicitly generated. This may change over time, so they’re
// enumerated here for clarity. TODO We should enforce that these files are
// specifically uploaded, rather than just the number of files.
const EXTRA_FILES: string[] = [
  "_observablehq/client.js",
  "_observablehq/runtime.js",
  "_observablehq/stdlib.js",
  "_observablehq/stdlib/dot.js",
  "_observablehq/stdlib/duckdb.js",
  "_observablehq/stdlib/inputs.css",
  "_observablehq/stdlib/inputs.js",
  "_observablehq/stdlib/mermaid.js",
  "_observablehq/stdlib/sqlite.js",
  "_observablehq/stdlib/tex.js",
  "_observablehq/stdlib/vega-lite.js",
  "_observablehq/stdlib/xlsx.js",
  "_observablehq/stdlib/zip.js",
  "_observablehq/style.css"
];

interface MockDeployEffectsOptions {
  apiKey?: string | null;
  deployConfig?: DeployConfig | null;
  isTty?: boolean;
  outputColumns?: number;
  debug?: boolean;
}

class MockDeployEffects extends MockConfigEffects implements DeployEffects {
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

  constructor({
    apiKey = validApiKey,
    deployConfig = null,
    isTty = true,
    outputColumns = 80,
    debug = false
  }: MockDeployEffectsOptions = {}) {
    super();
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

  async getObservableApiKey(effects: DeployEffects = this) {
    if (effects !== this) throw new Error("don't pass unrelated effects to mock effects methods");
    if (!this.observableApiKey) {
      effects?.logger.log(commandRequiresAuthenticationMessage);
      throw new Error("no key available in this test");
    }
    return {source: "test" as const, key: this.observableApiKey};
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
const TEST_OPTIONS = {config: TEST_CONFIG, message: undefined};
const DEPLOY_CONFIG: DeployConfig & {projectId: string; projectSlug: string; workspaceLogin: string} = {
  projectId: "project123",
  projectSlug: "bi",
  workspaceLogin: "mock-user-ws"
};

// TODO These tests need mockJsDelivr, too!
describe("deploy", () => {
  mockObservableApi();

  it("makes expected API calls for an existing project", async () => {
    const deployId = "deploy456";
    getCurentObservableApi()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG});
    effects.clack.inputs = ["fix some bugs"];
    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("updates title for exsting project if it doesn't match", async () => {
    const deployId = "deploy456";
    const oldTitle = `${TEST_CONFIG.title!} old`;
    getCurentObservableApi()
      .handleGetProject({
        ...DEPLOY_CONFIG,
        title: oldTitle
      })
      .handleUpdateProject({projectId: DEPLOY_CONFIG.projectId, title: TEST_CONFIG.title!})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
      .handlePostDeployUploaded({deployId})
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
    getCurentObservableApi()
      .handleGetProject(deployConfig)
      .handlePostDeploy({projectId: deployConfig.projectId, deployId})
      .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
      .handlePostDeployUploaded({deployId})
      .start();

    // no io response for message
    const effects = new MockDeployEffects({deployConfig});
    await deploy({...TEST_OPTIONS, message}, effects);

    effects.close();
  });

  it("makes expected API calls for non-existent project, user chooses to create", async () => {
    const deployId = "deploy456";
    getCurentObservableApi()
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .handleGetWorkspaceProjects({
        workspaceLogin: DEPLOY_CONFIG.workspaceLogin,
        projects: [{id: DEPLOY_CONFIG.projectId, slug: DEPLOY_CONFIG.projectSlug}]
      })
      .handleGetUser()
      .handlePostProject({projectId: DEPLOY_CONFIG.projectId})
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: true});
    effects.clack.inputs.push(null, DEPLOY_CONFIG.projectSlug, "fix some bugs");

    await deploy(TEST_OPTIONS, effects);

    effects.close();
  });

  it("makes expected API calls for configured, non-existent project; user chooses not to create", async () => {
    getCurentObservableApi()
      .handleGetUser()
      .handleGetWorkspaceProjects({workspaceLogin: DEPLOY_CONFIG.workspaceLogin, projects: []})
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .start();

    const effects = new MockDeployEffects({deployConfig: DEPLOY_CONFIG, isTty: true});
    effects.clack.inputs.push(false);

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("expected error");
    } catch (error) {
      CliError.assert(error, {message: "User cancelled deploy.", print: false, exitCode: 0});
    }

    effects.close();
  });

  it("makes expected API calls for configured, non-existent project; non-interactive", async () => {
    getCurentObservableApi()
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
    getCurentObservableApi()
      .handleGetUser()
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
    getCurentObservableApi()
      .handleGetUser()
      .handleGetWorkspaceProjects({workspaceLogin: DEPLOY_CONFIG.workspaceLogin, projects: [], status: 404})
      .handleGetProject({...DEPLOY_CONFIG, status: 404})
      .start();

    const effects = new MockDeployEffects({deployConfig, isTty: true});

    try {
      await deploy({...TEST_OPTIONS, config}, effects);
      assert.fail("expected error");
    } catch (err) {
      CliError.assert(err, {message: /Workspace mock-user-ws not found/});
    }

    effects.close();
  });

  it("throws an error if workspace is invalid", async () => {
    // getCurentObservableApi().start();
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
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      assert.equal(err.message, "no key available in this test");
      effects.logger.assertExactLogs([/^You need to be authenticated/]);
    }
  });

  it("throws an error with an invalid API key", async () => {
    getCurentObservableApi().handleGetUser({status: 401}).start();
    const effects = new MockDeployEffects({apiKey: invalidApiKey});

    try {
      await deploy(TEST_OPTIONS, effects);
      assert.fail("Should have thrown");
    } catch (error) {
      CliError.assert(error, {message: /You must be logged in/});
    }
  });

  it("throws an error if deploy creation fails", async () => {
    const deployId = "deploy456";
    getCurentObservableApi()
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
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    effects.close();
  });

  it("throws an error if file upload fails", async () => {
    const deployId = "deploy456";
    getCurentObservableApi()
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
    getCurentObservableApi()
      .handleGetProject(DEPLOY_CONFIG)
      .handlePostDeploy({projectId: DEPLOY_CONFIG.projectId, deployId})
      .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
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
    getCurentObservableApi()
      .handleGetUser()
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

  describe("when deploy state doesn't match", () => {
    it("interactive, when the user chooses to update", async () => {
      const newProjectId = "newProjectId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      const deployId = "deployId";
      getCurentObservableApi()
        .handleGetProject({
          ...DEPLOY_CONFIG,
          projectId: newProjectId
        })
        .handlePostDeploy({projectId: newProjectId, deployId})
        .handlePostDeployFile({deployId, repeat: EXTRA_FILES.length + 1})
        .handlePostDeployUploaded({deployId})
        .start();
      const effects = new MockDeployEffects({deployConfig: oldDeployConfig, isTty: true});
      // .addIoResponse(/Do you want to deploy anyway\?/, "y")
      // .addIoResponse(/^Deploy message: /, "deploying to re-created project");
      effects.clack.inputs.push(true, "recreate project");
      await deploy(TEST_OPTIONS, effects);
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json does not match/});
      effects.close();
    });

    it("interactive, when the user chooses not to update", async () => {
      const newProjectId = "newId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      getCurentObservableApi()
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
        CliError.assert(error, {message: "User cancelled deploy", print: false, exitCode: 0});
      }
      effects.clack.log.assertLogged({message: /`projectId` in your deploy.json does not match/});
      effects.close();
    });

    it("non-interactive", async () => {
      const newProjectId = "newId";
      const oldDeployConfig = {...DEPLOY_CONFIG, projectId: "oldProjectId"};
      getCurentObservableApi()
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
  });
});
