import assert, {fail} from "node:assert";
import {Readable, Writable} from "node:stream";
import type {DeployEffects} from "../src/deploy.js";
import {deploy} from "../src/deploy.js";
import {isHttpError} from "../src/error.js";
import type {DeployConfig} from "../src/observableApiConfig.js";
import {MockLogger} from "./mocks/logger.js";
import {
  ObservableApiMock,
  invalidApiKey,
  userWithTwoWorkspaces,
  userWithZeroWorkspaces,
  validApiKey
} from "./mocks/observableApi.js";

class MockDeployEffects implements DeployEffects {
  public logger = new MockLogger();
  public input = new Readable();
  public output: NodeJS.WritableStream;
  public _observableApiKey: string | null = null;
  public _deployConfig: DeployConfig | null = null;
  public _projectSlug = "my-project-slug";

  constructor({
    apiKey = validApiKey,
    deployConfig = null
  }: {apiKey?: string | null; deployConfig?: DeployConfig | null} = {}) {
    this._observableApiKey = apiKey;
    this._deployConfig = deployConfig;
    const that = this;
    this.output = new Writable({
      write(data, _enc, callback) {
        const dataString = data.toString();
        if (dataString == "New project name: ") {
          that.input.push(`${that._projectSlug}\n`);
          // Having to null/reinit input seems wrong.
          // TODO: find the correct way to submit to readline but keep the same
          // input stream across multiple readline interactions.
          that.input.push(null);
          that.input = new Readable();
        } else if (dataString.includes("Choice: ")) {
          that.input.push("1\n");
          that.input.push(null);
          that.input = new Readable();
        }
        callback();
      }
    });
  }

  async getObservableApiKey() {
    return this._observableApiKey;
  }

  async getDeployConfig() {
    return this._deployConfig;
  }

  async setDeployConfig(sourceRoot: string, config: DeployConfig) {
    this._deployConfig = config;
  }
}

const TEST_SOURCE_ROOT = "test/example-dist";

describe("deploy", () => {
  it("makes expected API calls for a new project", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser()
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId, repeat: 3})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockDeployEffects();
    await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);

    apiMock.close();
    const deployConfig = await effects.getDeployConfig();
    assert.equal(deployConfig?.project?.id, projectId);
    assert.equal(deployConfig?.project?.slug, effects._projectSlug);
  });

  it("makes expected API calls for an existing project", async () => {
    const projectId = "project123";
    const deployConfig = {project: {id: projectId}};
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId, repeat: 3})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockDeployEffects({deployConfig});
    await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);

    apiMock.close();
  });

  it("shows message for missing API key", async () => {
    const apiMock = new ObservableApiMock().start();
    const effects = new MockDeployEffects({apiKey: null});

    await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);

    apiMock.close();
    effects.logger.assertExactLogs([/^You need to be authenticated/]);
  });

  it("handles multiple user workspaces", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser({user: userWithTwoWorkspaces})
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId, repeat: 3})
      .handlePostDeployUploaded({deployId})
      .start();
    const effects = new MockDeployEffects();

    await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);

    apiMock.close();
    const deployConfig = await effects.getDeployConfig();
    assert.equal(deployConfig?.project?.id, projectId);
    assert.equal(deployConfig?.project?.slug, effects._projectSlug);
  });

  it("logs an error during project creation when user has no workspaces", async () => {
    const apiMock = new ObservableApiMock().handleGetUser({user: userWithZeroWorkspaces}).start();
    const effects = new MockDeployEffects();

    await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);

    apiMock.close();
    effects.logger.assertExactErrors([/^Current user doesn't have any Observable workspaces/]);
  });

  it("throws an error with an invalid API key", async () => {
    const apiMock = new ObservableApiMock().handleGetUser({status: 401}).start();
    const effects = new MockDeployEffects({apiKey: invalidApiKey});

    try {
      await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 401);
    }

    apiMock.close();
  });

  it("throws an error if project creation fails", async () => {
    const apiMock = new ObservableApiMock().handleGetUser().handlePostProject({status: 500}).start();
    const effects = new MockDeployEffects();

    try {
      await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    apiMock.close();
  });

  it("throws an error if deploy creation fails", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser()
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId, status: 500})
      .start();
    const effects = new MockDeployEffects();

    try {
      await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    apiMock.close();
  });

  it("throws an error if file upload fails", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser()
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId, status: 500})
      .start();
    const effects = new MockDeployEffects();

    try {
      await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    apiMock.close();
  });

  it("throws an error if deploy uploaded fails", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser()
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId, repeat: 3})
      .handlePostDeployUploaded({deployId, status: 500})
      .start();
    const effects = new MockDeployEffects();

    try {
      await deploy({sourceRoot: TEST_SOURCE_ROOT}, effects);
      fail("Should have thrown an error");
    } catch (error) {
      console.log(error);
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    apiMock.close();
  });
});
