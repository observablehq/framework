import fs from "node:fs/promises";
import packageJson from "../package.json";
import {CliError, HttpError} from "./error.js";
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

export interface GetProjectResponse {
  id: string;
  slug: string;
  servingRoot: string | null;
}

export function getObservableUiOrigin(env = process.env): URL {
  const urlText = env["OBSERVABLE_ORIGIN"] ?? "https://observablehq.com";
  try {
    return new URL(urlText);
  } catch (error) {
    throw new CliError(`Invalid OBSERVABLE_ORIGIN: ${urlText}`, {cause: error});
  }
}

export function getObservableApiOrigin(env = process.env): URL {
  const urlText = env["OBSERVABLE_API_ORIGIN"];
  if (urlText) {
    try {
      return new URL(urlText);
    } catch (error) {
      throw new CliError(`Invalid OBSERVABLE_API_ORIGIN: ${urlText}`, {cause: error});
    }
  }

  const uiOrigin = getObservableUiOrigin(env);
  uiOrigin.hostname = "api." + uiOrigin.hostname;
  return uiOrigin;
}

export class ObservableApiClient {
  private _apiHeaders: Record<string, string>;
  private _apiOrigin: URL;

  constructor({apiKey, apiOrigin = getObservableApiOrigin()}: {apiOrigin?: URL; apiKey?: ApiKey} = {}) {
    this._apiOrigin = apiOrigin;
    this._apiHeaders = {
      Accept: "application/json",
      "User-Agent": `Observable CLI ${packageJson.version}`,
      "X-Observable-Api-Version": "2023-12-06"
    };
    if (apiKey) this.setApiKey(apiKey);
  }

  public setApiKey(apiKey: ApiKey): void {
    this._apiHeaders["Authorization"] = `apikey ${apiKey.key}`;
  }

  private async _fetch<T = unknown>(url: URL, options: RequestInit): Promise<T> {
    let response;
    try {
      response = await fetch(url, {...options, headers: {...this._apiHeaders, ...options.headers}});
    } catch (error) {
      // Check for undici failures and print them in a way that shows more details. Helpful in tests.
      if (error instanceof Error && error.message === "fetch failed") console.error(error);
      throw error;
    }

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
    return await this._fetch<GetCurrentUserResponse>(new URL("/cli/user", this._apiOrigin), {method: "GET"});
  }

  async getProject({
    workspaceLogin,
    projectSlug
  }: {
    workspaceLogin: string;
    projectSlug: string;
  }): Promise<GetProjectResponse> {
    const url = new URL(`/cli/project/@${workspaceLogin}/${projectSlug}`, this._apiOrigin);
    return await this._fetch<GetProjectResponse>(url, {method: "GET"});
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
    return await this._fetch<PostProjectResponse>(new URL("/cli/project", this._apiOrigin), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title, slug, workspace: workspaceId})
    });
  }

  async postDeploy({projectId, message}: {projectId: string; message: string}): Promise<string> {
    const data = await this._fetch<{id: string}>(new URL(`/cli/project/${projectId}/deploy`, this._apiOrigin), {
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
    const url = new URL(`/cli/deploy/${deployId}/file`, this._apiOrigin);
    const body = new FormData();
    const blob = new Blob([contents]);
    body.append("file", blob);
    body.append("client_name", relativePath);
    await this._fetch(url, {method: "POST", body});
  }

  async postDeployUploaded(deployId: string): Promise<DeployInfo> {
    return await this._fetch<DeployInfo>(new URL(`/cli/deploy/${deployId}/uploaded`, this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: "{}"
    });
  }

  async postAuthRequest(scopes: string[]): Promise<PostAuthRequestResponse> {
    return await this._fetch<PostAuthRequestResponse>(new URL("/cli/auth/request", this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({scopes})
    });
  }

  async postAuthRequestPoll(id: string): Promise<PostAuthRequestPollResponse> {
    return await this._fetch<PostAuthRequestPollResponse>(new URL("/cli/auth/request/poll", this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({id})
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

export interface PostAuthRequestResponse {
  id: string;
  confirmationCode: string;
}

export interface PostAuthRequestPollResponse {
  status: string;
  apiKey: null | {
    id: string;
    key: string;
  };
}
