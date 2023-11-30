import fs from "node:fs/promises";
import packageJson from "../package.json";
import {HttpError} from "./error.js";
import type {Logger} from "./logger.js";
import type {ApiKey} from "./observableApiConfig.js";

export interface GetCurrentUserResponse {
  id: string;
  login: string;
  name: string;
  tier: string;
  has_workspace: boolean;
  workspaces: WorkspaceResponse[];
}

export interface WorkspaceResponse {
  id: string;
  login: string;
  name: string;
  tier: string;
  type: string;
  role: string;
}

export function getObservableUiHost(): URL {
  const urlText = process.env["OBSERVABLEHQ_HOST"] ?? "https://observablehq.com";
  try {
    return new URL(urlText);
  } catch (error) {
    console.error(`Invalid OBSERVABLEHQ_HOST environment variable: ${error}`);
    process.exit(1);
  }
}

export function getObservableApiHost(): URL {
  const urlText = process.env["OBSERVABLEHQ_API_HOST"];
  if (urlText) {
    try {
      return new URL(urlText);
    } catch (error) {
      console.error(`Invalid OBSERVABLEHQ_API_HOST environment variable: ${error}`);
      process.exit(1);
    }
  }

  const uiHost = getObservableUiHost();
  uiHost.hostname = "api." + uiHost.hostname;
  return uiHost;
}

export class ObservableApiClient {
  private _apiHeaders: [string, string][] = [];
  private _apiHost: URL;
  private _logger: Logger;

  constructor({
    apiKey,
    apiHost = getObservableApiHost(),
    logger = console
  }: {
    apiHost?: URL;
    apiKey: ApiKey;
    logger: Logger;
  }) {
    this._apiHost = apiHost;
    this._logger = logger;
    this._apiHeaders = [
      ["Accept", "application/json"],
      ["Authorization", `apikey ${apiKey.key}`],
      ["User-Agent", `Observable CLI ${packageJson.version}`],
      ["X-Observable-Api-Version", "2023-11-06"]
    ];
  }

  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    const url = new URL("/cli/user", this._apiHost);
    const response = await fetch(url, {
      method: "GET",
      headers: this._apiHeaders
    });
    if (!response.ok) {
      throw new HttpError("Unexpected response status", response.status);
    }
    const responseJson = await response.json();
    return responseJson as GetCurrentUserResponse;
  }

  async postProject(slug: string, workspace: string): Promise<string> {
    const url = new URL("/cli/project", this._apiHost);
    const response = await fetch(url, {
      method: "POST",
      headers: [...this._apiHeaders, ["Content-Type", "application/json"]],
      body: JSON.stringify({slug, workspace})
    });
    if (!response.ok) {
      throw new HttpError("Unexpected response status", response.status);
    }
    const responseJson = await response.json();
    return responseJson.id;
  }

  async postDeploy(projectId: string): Promise<string> {
    const url = new URL(`/cli/project/${projectId}/deploy`, this._apiHost);
    const response = await fetch(url, {
      method: "POST",
      headers: [...this._apiHeaders, ["Content-Type", "application/json"]],
      body: JSON.stringify({})
    });
    if (!response.ok) {
      throw new HttpError("Unexpected response status", response.status);
    }
    const responseJson = await response.json();
    return responseJson.id;
  }

  async postDeployFile(deployId: string, filePath: string, relativePath: string): Promise<void> {
    const buffer = await fs.readFile(filePath);
    return await this.postDeployFileContents(deployId, buffer, relativePath);
  }

  async postDeployFileContents(deployId: string, contents: Buffer | string, relativePath: string): Promise<void> {
    if (typeof contents === "string") contents = Buffer.from(contents);
    const url = new URL(`/cli/deploy/${deployId}/file`, this._apiHost);
    const body = new FormData();
    const blob = new Blob([contents]);
    body.append("file", blob);
    body.append("client_name", relativePath);
    const response = await fetch(url, {
      method: "POST",
      headers: this._apiHeaders,
      body
    });

    if (!response.ok) {
      throw new HttpError("Unexpected response status", response.status);
    }
  }

  async postDeployUploaded(deployId: string): Promise<void> {
    this._logger.log(`Marking deploy id ${deployId} upload complete`);
    const url = new URL(`/cli/deploy/${deployId}/uploaded`, this._apiHost);
    const response = await fetch(url, {
      method: "POST",
      headers: [...this._apiHeaders, ["Content-Type", "application/json"]],
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new HttpError("Unexpected response status", response.status);
    }
  }
}
