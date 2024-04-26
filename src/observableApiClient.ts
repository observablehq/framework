import fs from "node:fs/promises";
import type {ClackEffects} from "./clack.js";
import {CliError, HttpError, isApiError} from "./error.js";
import {formatByteSize} from "./format.js";
import type {ApiKey} from "./observableApiConfig.js";
import {faint, red} from "./tty.js";

const MIN_RATE_LIMIT_RETRY_AFTER = 1;

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

export type ObservableApiClientOptions = {
  apiOrigin?: URL;
  apiKey?: ApiKey;
  clack: ClackEffects;
};

export class ObservableApiClient {
  private _apiHeaders: Record<string, string>;
  private _apiOrigin: URL;
  private _clack: ClackEffects;
  private _rateLimit: null | Promise<void> = null;

  constructor({apiKey, apiOrigin = getObservableApiOrigin(), clack}: ObservableApiClientOptions) {
    this._apiOrigin = apiOrigin;
    this._apiHeaders = {
      Accept: "application/json",
      "User-Agent": `Observable Framework ${process.env.npm_package_version}`,
      "X-Observable-Api-Version": "2023-12-06"
    };
    this._clack = clack;
    if (apiKey) this.setApiKey(apiKey);
  }

  public setApiKey(apiKey: ApiKey): void {
    this._apiHeaders["Authorization"] = `apikey ${apiKey.key}`;
  }

  private async _fetch<T = unknown>(url: URL, options: RequestInit): Promise<T> {
    let response;
    const doFetch = async () => await fetch(url, {...options, headers: {...this._apiHeaders, ...options.headers}});
    try {
      response = await doFetch();
    } catch (error) {
      // Check for undici failures and print them in a way that shows more details. Helpful in tests.
      if (error instanceof Error && error.message === "fetch failed") console.error(error);
      throw error;
    }

    if (response.status === 429) {
      // rate limit
      if (this._rateLimit === null) {
        let retryAfter = +response.headers.get("Retry-After");
        if (isNaN(retryAfter) || retryAfter < MIN_RATE_LIMIT_RETRY_AFTER) retryAfter = MIN_RATE_LIMIT_RETRY_AFTER;
        this._clack.log.warn(`Hit server rate limit. Waiting for ${retryAfter} seconds.`);
        this._rateLimit = new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      }
      await this._rateLimit;
      response = await doFetch();
    }

    if (!response.ok) {
      let details = await response.text();
      try {
        details = JSON.parse(details);
      } catch (error) {
        // that's ok
      }
      const error = new HttpError(
        `Unexpected response status ${JSON.stringify(response.status)} for ${options.method ?? "GET"} ${url.href}`,
        response.status,
        {details}
      );

      // check for version mismatch
      if (
        response.status === 400 &&
        isApiError(error) &&
        error.details.errors.some((e) => e.code === "VERSION_MISMATCH")
      ) {
        console.log(red("The version of Observable Framework you are using is not compatible with the server."));
        console.log(faint(`Expected ${details.errors[0].meta.expected}, but using ${details.errors[0].meta.actual}`));
      }
      throw error;
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
    workspaceId,
    accessLevel
  }: {
    title: string;
    slug: string;
    workspaceId: string;
    accessLevel: string;
  }): Promise<PostProjectResponse> {
    return await this._fetch<PostProjectResponse>(new URL("/cli/project", this._apiOrigin), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title, slug, workspace: workspaceId, accessLevel})
    });
  }

  async postEditProject(projectId: string, updates: PostEditProjectRequest): Promise<PostEditProjectResponse> {
    return await this._fetch<PostEditProjectResponse>(new URL(`/cli/project/${projectId}/edit`, this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({...updates})
    });
  }

  async getWorkspaceProjects(workspaceLogin: string): Promise<GetProjectResponse[]> {
    const pages = await this._fetch<PaginatedList<GetProjectResponse>>(
      new URL(`/cli/workspace/@${workspaceLogin}/projects`, this._apiOrigin),
      {method: "GET"}
    );
    // todo: handle pagination?
    return pages.results;
  }

  async getDeploy(deployId: string): Promise<GetDeployResponse> {
    return await this._fetch<GetDeployResponse>(new URL(`/cli/deploy/${deployId}`, this._apiOrigin), {method: "GET"});
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
    try {
      await this._fetch(url, {method: "POST", body});
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      throw new CliError(`While uploading ${relativePath} (${formatByteSize(contents.length)}): ${message}`, {
        cause: error
      });
    }
  }

  async postDeployManifest(deployId: string, files: DeployManifestFile[]): Promise<PostDeployManifestResponse> {
    return await this._fetch<PostDeployManifestResponse>(new URL(`/cli/deploy/${deployId}/manifest`, this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({files})
    });
  }

  async postDeployUploaded(deployId: string): Promise<DeployInfo> {
    return await this._fetch<DeployInfo>(new URL(`/cli/deploy/${deployId}/uploaded`, this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: "{}"
    });
  }

  async postAuthRequest(options: {scopes: string[]; deviceDescription: string}): Promise<PostAuthRequestResponse> {
    return await this._fetch<PostAuthRequestResponse>(new URL("/cli/auth/request", this._apiOrigin), {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(options)
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

export interface PostEditProjectRequest {
  title?: string;
}

export interface PostEditProjectResponse {
  id: string;
  slug: string;
  title: string;
}

export interface GetCurrentUserResponse {
  id: string;
  login: string;
  name: string;
  tier: string;
  has_workspace: boolean;
  workspaces: WorkspaceResponse[];
}

type Role = "owner" | "member" | "viewer" | "guest_member" | "guest_viewer";

type ProjectRole = "owner" | "editor" | "viewer";

type ProjectInfo = {
  project_slug: string;
  project_role: ProjectRole;
};

export interface WorkspaceResponse {
  id: string;
  login: string;
  name: string;
  tier: string;
  type: string;
  role: Role;
  projects_info: ProjectInfo[];
}

export type PostProjectResponse = GetProjectResponse;

export interface GetProjectResponse {
  accessLevel: string;
  id: string;
  slug: string;
  title: string;
  owner: {id: string; login: string};
  creator: {id: string; login: string};
  // Available fields that we don't use
  // servingRoot: string | null;
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

export interface PaginatedList<T> {
  results: T[];
  // Available fields that we don't use
  // page: number;
  // per_page: number;
  // total: number;
  // truncated: boolean;
}

export interface GetDeployResponse {
  id: string;
  status: string;
  url: string;
}

export interface DeployManifestFile {
  path: string;
  size: number;
  hash: string;
}

export interface PostDeployManifestResponse {
  status: "ok" | "error";
  detail: string | null;
  files: {
    path: string;
    status: "upload" | "skip" | "error";
    detail: string | null;
  }[];
}
