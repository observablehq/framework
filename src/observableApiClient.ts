import fs from "node:fs/promises";
import packageJson from "../package.json";
import {HttpError} from "./error.js";
import type {ApiKey} from "./observableApiConfig.js";
import {faint, red} from "./tty.js";

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
  private _apiHeaders: Record<string, string>;
  private _apiHost: URL;

  constructor({apiKey, apiHost = getObservableApiHost()}: {apiHost?: URL; apiKey: ApiKey}) {
    this._apiHost = apiHost;
    this._apiHeaders = {
      Accept: "application/json",
      Authorization: `apikey ${apiKey.key}`,
      "User-Agent": `Observable CLI ${packageJson.version}`,
      "X-Observable-Api-Version": "2023-12-06"
    };
  }

  private async _fetch<T = unknown>(url: URL, options: RequestInit): Promise<T> {
    const response = await fetch(url, {...options, headers: {...this._apiHeaders, ...options.headers}});

    if (!response.ok) {
      // check for version mismatch
      if (response.status === 400) {
        const body = await response.text();
        try {
          const data = JSON.parse(body);
          if (Array.isArray(data.errors) && data.errors.some((d) => d.code === "VERSION_MISMATCH")) {
            console.log(red("The version of the Observable CLI you are using is not compatible with the server."));
            console.log(faint(`Expected ${data.errors[0].meta.expected}, but using ${data.errors[0].meta.actual}`));
          }
        } catch (err) {
          // just fall through
        }
      }
      throw new HttpError(`Unexpected response status ${JSON.stringify(response.status)}`, response.status);
    }

    if (response.status === 204) return null as T;
    if (response.headers.get("Content-Type")?.startsWith("application/json")) return await response.json();
    return (await response.text()) as T;
  }

  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return await this._fetch<GetCurrentUserResponse>(new URL("/cli/user", this._apiHost), {method: "GET"});
  }

  async postProject({
    title,
    slug,
    workspaceId
  }: {
    title: string;
    slug: string;
    workspaceId: string;
  }): Promise<PostProjectResponse> {
    return await this._fetch<PostProjectResponse>(new URL("/cli/project", this._apiHost), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title, slug, workspace: workspaceId})
    });
  }

  async postDeploy({projectId, message}: {projectId: string; message: string}): Promise<string> {
    const data = await this._fetch<{id: string}>(new URL(`/cli/project/${projectId}/deploy`, this._apiHost), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message})
    });
    return data.id;
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
    await this._fetch(url, {method: "POST", body});
  }

  async postDeployUploaded(deployId: string): Promise<DeployInfo> {
    return await this._fetch<DeployInfo>(new URL(`/cli/deploy/${deployId}/uploaded`, this._apiHost), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: "{}"
    });
  }
}

export interface PostProjectResponse {
  id: string;
  slug: string;
  title: string;
  owner: {login: string};
  creator: {login: string};
}

export interface DeployInfo {
  id: string;
  status: string;
  url: string;
}
