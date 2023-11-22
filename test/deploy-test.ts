import assert from "node:assert";
import type {CommandEffects} from "../src/deploy.js";
import {deploy} from "../src/deploy.js";
import {isHttpError} from "../src/error.js";
import type {ProjectConfig} from "../src/toolConfig.js";
import {MockLogger} from "./mocks/logger.js";
import {ObservableApiMock, invalidApiKey, validApiKey} from "./mocks/observableApi.js";

class MockEffects implements CommandEffects {
  public logger = new MockLogger();
  public _observableApiKey: string | null = null;
  public _projectId: string | null = null;
  public _slug = "angry-anenome";
  public _workspace = "abcdefg012345";
  public _deployFiles = [{path: "test/example-dist/index.html", relativePath: "index.html"}];
  public projectConfig: ProjectConfig | null = null;

  constructor({apiKey = null, projectId = null}: {apiKey?: string | null; projectId?: string | null} = {}) {
    this._observableApiKey = apiKey;
    this._projectId = projectId;
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

  async getNewProjectSlug() {
    return this._slug;
  }

  async getNewProjectWorkspace() {
    return this._workspace;
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
    await deploy(effects);

    apiMock.close();

    // Verify we saved the new project config.
    assert.equal(effects.projectConfig?.id, projectId);
    assert.equal(effects.projectConfig?.slug, effects._slug);
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
    await deploy(effects);

    apiMock.close();

    // Verify we never re-saved the project config.
    assert.equal(effects.projectConfig, null);
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
});
