import assert, {fail} from "node:assert";
import {Readable, Writable} from "node:stream";
import type {CommandEffects} from "../src/deploy.js";
import {deploy} from "../src/deploy.js";
import {isHttpError} from "../src/error.js";
import type {ProjectConfig} from "../src/toolConfig.js";
import {MockLogger} from "./mocks/logger.js";
import {ObservableApiMock, invalidApiKey, mockWorkspaces, validApiKey} from "./mocks/observableApi.js";

class MockEffects implements CommandEffects {
  public projectConfig: ProjectConfig | null = null;
  public logger = new MockLogger();
  public inputStream = new Readable();
  public outputStream: NodeJS.WritableStream;
  public _observableApiKey: string | null = null;
  public _projectName = "My Project Name";
  public _projectId: string | null = null;
  public _deployFiles = [{path: "test/example-dist/index.html", relativePath: "index.html"}];

  constructor({apiKey = null, projectId = null}: {apiKey?: string | null; projectId?: string | null} = {}) {
    this._observableApiKey = apiKey;
    this._projectId = projectId;
    const that = this;
    this.outputStream = new Writable({
      write(data, _enc, callback) {
        const dataString = data.toString();
        if (dataString == "New project name: ") {
          that.inputStream.push(`${that._projectName}\n`);
          // Having to null/reinit inputStream seems wrong.
          // TODO: find the correct way to submit to readline but keep the same
          // inputStream across multiple readline interactions.
          that.inputStream.push(null);
          that.inputStream = new Readable();
        } else if (dataString.includes("Choice: ")) {
          that.inputStream.push("1\n");
          that.inputStream.push(null);
          that.inputStream = new Readable();
        }
        callback();
      }
    });
  }

  async getObservableApiKey() {
    return this._observableApiKey;
  }

  async getProjectId() {
    return this._projectId;
  }

  async setProjectConfig(config: ProjectConfig) {
    this.projectConfig = config;
  }

  async getDeployFiles() {
    return this._deployFiles;
  }
}

describe("deploy", () => {
  it("makes expected API calls for a new project", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser()
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    await deploy(effects, "test/example-dist");

    apiMock.close();

    // Verify we saved the new project config.
    assert.equal(effects.projectConfig?.id, projectId);
    assert.equal(effects.projectConfig?.slug, effects._projectName);
  });

  it("makes expected API calls for an existing project", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId});
    await deploy(effects, "test/example-dist");

    apiMock.close();

    // Verify we never re-saved the project config.
    assert.equal(effects.projectConfig, null);
  });

  it("shows message for missing API key", async () => {
    const apiMock = new ObservableApiMock().start();

    const effects = new MockEffects({apiKey: null, projectId: null});
    await deploy(effects, "test/example-dist");

    apiMock.close();

    effects.logger.assertExactLogs([/^You need to be authenticated/]);
  });

  it("fails fast with an invalid API key", async () => {
    const apiMock = new ObservableApiMock().handleGetUser({valid: false}).start();

    const effects = new MockEffects({apiKey: invalidApiKey, projectId: null});
    try {
      await deploy(effects);
      assert.fail("Should have thrown");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 401);
    }

    apiMock.close();
  });

  it("handles multiple user workspaces", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handleGetUser({workspaces: [mockWorkspaces[0], mockWorkspaces[1]]})
      .handlePostProject({projectId})
      .handlePostDeploy({projectId, deployId})
      .handlePostDeployFile({deployId})
      .handlePostDeployUploaded({deployId})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    await deploy(effects, "test/example-dist");

    apiMock.close();

    // Verify we saved the new project config.
    assert.equal(effects.projectConfig?.id, projectId);
    assert.equal(effects.projectConfig?.slug, effects._projectName);
  });

  it("logs an error during project creation when user has no workspaces", async () => {
    const apiMock = new ObservableApiMock().handleGetUser({workspaces: []}).start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    await deploy(effects, "test/example-dist");

    apiMock.close();
  });

  it("throws an error if project creation fails", async () => {
    const apiMock = new ObservableApiMock().handleGetUser().handlePostProject({errorStatus: 500}).start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    try {
      await deploy(effects, "test/example-dist");
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
      .handlePostDeploy({projectId, deployId, errorStatus: 500})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    try {
      await deploy(effects, "test/example-dist");
      fail("Should have thrown an error");
    } catch (error) {
      assert.ok(isHttpError(error));
      assert.equal(error.statusCode, 500);
    }

    apiMock.close();
  });
});
