import type {CommandEffects} from "../src/deploy.js";
import {deploy} from "../src/deploy.js";
import type {ProjectConfig} from "../src/toolConfig.js";
import {MockLogger} from "./mocks/logger.js";
import {ObservableApiMock, validApiKey} from "./mocks/observableApi.js";

class MockEffects implements CommandEffects {
  public logger = new MockLogger();
  public _observableApiKey: string | null = null;
  public _projectId: string | null = null;
  public _slug = "angry-anenome";
  public _workspace = "abcdefg012345";
  public _deployFiles = [{path: "test/example-dist/index.html", relativePath: "index.html"}];

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setProjectConfig(config: ProjectConfig) {
    return;
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
      .handleGetUser({valid: true})
      .handlePostProject({projectId, valid: true})
      .handlePostDeploy({projectId, deployId, valid: true})
      .handlePostDeployFile({deployId, valid: true})
      .handlePostDeployUploaded({deployId, valid: true})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId: null});
    await deploy(effects);

    apiMock.close();
  });

  it("makes expected API calls for an existing project", async () => {
    const projectId = "project123";
    const deployId = "deploy456";
    const apiMock = new ObservableApiMock()
      .handlePostDeploy({projectId, deployId, valid: true})
      .handlePostDeployFile({deployId, valid: true})
      .handlePostDeployUploaded({deployId, valid: true})
      .start();

    const effects = new MockEffects({apiKey: validApiKey, projectId});
    await deploy(effects);

    apiMock.close();
  });
});
