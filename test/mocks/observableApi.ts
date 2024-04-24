import type {MockAgent} from "undici";
import type {Interceptable} from "undici";
import PendingInterceptorsFormatter from "undici/lib/mock/pending-interceptors-formatter.js";
import type {
  GetCurrentUserResponse,
  GetProjectResponse,
  PaginatedList,
  PostAuthRequestPollResponse,
  PostAuthRequestResponse,
  PostDeployManifestResponse
} from "../../src/observableApiClient.js";
import {getObservableApiOrigin, getObservableUiOrigin} from "../../src/observableApiClient.js";
import {getCurrentAgent, mockAgent} from "./undici.js";

export const validApiKey = "MOCK-VALID-KEY";
export const invalidApiKey = "MOCK-INVALID-KEY";

const emptyErrorBody = JSON.stringify({errors: []});

let apiMock: ObservableApiMock;

export function mockObservableApi() {
  mockAgent();

  beforeEach(() => {
    apiMock = new ObservableApiMock();
    const agent = getCurrentAgent();
    agent.get(getOrigin());
  });

  afterEach(function () {
    apiMock.after();
  });
}

export function getCurrentObservableApi(): ObservableApiMock {
  if (!apiMock) throw new Error("mockObservableApi not initialized");
  return apiMock;
}

function getOrigin() {
  return getObservableApiOrigin().toString().replace(/\/$/, "");
}

type ExpectedFile = {
  path: string;
  deployId: string;
  action: "skip" | "upload";
};

class ObservableApiMock {
  private _agent: MockAgent | null = null;
  private _handlers: ((pool: Interceptable) => void)[] = [];
  private _expectedFiles: ExpectedFile[] = [];

  public start(): ObservableApiMock {
    this._agent = getCurrentAgent();
    const mockPool = this._agent.get(getOrigin());
    for (const handler of this._handlers) handler(mockPool);
    this.handleExpectedFiles(mockPool);
    return this;
  }

  public after() {
    const agent = getCurrentAgent();
    for (const intercept of agent.pendingInterceptors()) {
      if (intercept.origin === getOrigin()) {
        console.log(`Expected all intercepts for ${getOrigin()} to be handled`);
        agent.assertNoPendingInterceptors({
          pendingInterceptorsFormatter: new FilteringPendingInterceptorFormatter(getOrigin())
        });
      }
    }
  }

  public pendingInterceptors() {
    return this._agent?.pendingInterceptors();
  }

  addHandler(handler: (pool: Interceptable) => void): ObservableApiMock {
    this._handlers.push(handler);
    return this;
  }

  private handleExpectedFiles(mockPool: Interceptable) {
    if (this._expectedFiles.length > 0) {
      const headers = authorizationHeader(true);
      for (const {path, deployId, action} of this._expectedFiles) {
        if (action === "upload") {
          mockPool
            .intercept({
              path: `/cli/deploy/${deployId}/file`,
              method: "POST",
              headers: headersMatcher(headers),
              body: formDataMatcher({client_name: path})
            })
            .reply(204, "");
        }
      }

      const byDeployId: Record<string, ExpectedFile[]> = this._expectedFiles.reduce((acc, file) => {
        (acc[file.deployId] ??= []).push(file);
        return acc;
      }, {});
      for (const [deployId, files] of Object.entries(byDeployId)) {
        mockPool
          .intercept({
            path: `/cli/deploy/${deployId}/manifest`,
            method: "POST",
            headers: headersMatcher(headers)
          })
          .reply(
            200,
            JSON.stringify({
              status: "ok",
              detail: null,
              files: files.map((f) => ({path: f.path, detail: null, status: f.action}))
            } satisfies PostDeployManifestResponse),
            {headers: {"content-type": "application/json"}}
          );
      }
    }
  }

  handleGetCurrentUser({
    user = userWithOneWorkspace,
    status = 200
  }: {user?: any; status?: number} = {}): ObservableApiMock {
    const response = status == 200 ? JSON.stringify(user) : emptyErrorBody;
    const headers = status === 401 ? {} : authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: "/cli/user", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handleGetProject({
    workspaceLogin,
    projectSlug,
    projectId = "project123",
    title = "Build test case",
    accessLevel = "private",
    status = 200
  }: {
    workspaceLogin: string;
    projectSlug: string;
    projectId?: string;
    title?: string;
    accessLevel?: string;
    status?: number;
  }): ObservableApiMock {
    const response =
      status === 200
        ? JSON.stringify({
            accessLevel,
            id: projectId,
            slug: projectSlug,
            title,
            creator: {id: "user-id", login: "user-login"},
            owner: {id: "workspace-id", login: "workspace-login"}
          } satisfies GetProjectResponse)
        : emptyErrorBody;
    const headers = authorizationHeader(status !== 401 && status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/project/@${workspaceLogin}/${projectSlug}`, headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handlePostProject({
    projectId = "project123",
    workspaceId = workspaces[0].id,
    slug = "mock-project",
    accessLevel = "private",
    status = 200
  }: {
    projectId?: string;
    title?: string;
    slug?: string;
    workspaceId?: string;
    accessLevel?: string;
    status?: number;
  } = {}): ObservableApiMock {
    const owner = workspaces.find((w) => w.id === workspaceId);
    const creator = userWithOneWorkspace;
    if (!owner || !creator) throw new Error("Invalid owner/creator");
    const response =
      status == 200
        ? JSON.stringify({
            accessLevel,
            id: projectId,
            slug,
            title: "Mock Project",
            owner,
            creator
          } satisfies GetProjectResponse)
        : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: "/cli/project", method: "POST", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handleUpdateProject({
    projectId = "project123",
    title,
    status = 200
  }: {
    projectId?: string;
    title?: string;
    status?: number;
  } = {}): ObservableApiMock {
    const response = status == 200 ? JSON.stringify({title, slug: "bi"}) : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/project/${projectId}/edit`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handleGetWorkspaceProjects({
    workspaceLogin,
    projects,
    status = 200
  }: {
    workspaceLogin: string;
    projects: {slug: string; id: string; title?: string; accessLevel?: string}[];
    status?: number;
  }): ObservableApiMock {
    const owner = workspaces.find((w) => w.login === workspaceLogin);
    const creator = userWithOneWorkspace;
    if (!owner || !creator) throw new Error("Invalid owner/creator");
    const response =
      status === 200
        ? JSON.stringify({
            results: projects.map((p) => ({
              ...p,
              creator,
              owner,
              title: p.title ?? "Mock Title",
              accessLevel: p.accessLevel ?? "private"
            }))
          } satisfies PaginatedList<GetProjectResponse>)
        : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/workspace/@${workspaceLogin}/projects`, headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handlePostDeploy({
    projectId,
    deployId,
    status = 200
  }: {projectId?: string; deployId?: string; status?: number} = {}): ObservableApiMock {
    const response = status == 200 ? JSON.stringify({id: deployId}) : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/project/${projectId}/deploy`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  /** Register a file that is expected to be uploaded. Also includes that file in
   * an automatic interceptor to `/deploy/:deployId/manifest`. If the action is
   * "upload", an interceptor for `/deploy/:deployId/file` will be registered.
   * If it is set to "skip", that interceptor will not be registered. */
  expectFileUpload({
    deployId,
    path,
    action = "upload"
  }: {
    deployId: string;
    path: string;
    action?: "skip" | "upload";
  }): ObservableApiMock {
    this._expectedFiles.push({deployId, path, action});
    return this;
  }

  handlePostDeployManifest({
    deployId,
    status = 200,
    files = []
  }: {deployId?: string; status?: number; files?: ExpectedFile[]} = {}): ObservableApiMock {
    const response =
      status == 200
        ? JSON.stringify({
            status: "ok",
            detail: null,
            files: files.map((f) => ({path: f.path, detail: null, status: f.action}))
          } satisfies PostDeployManifestResponse)
        : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/deploy/${deployId}/manifest`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handlePostDeployFile({
    deployId,
    clientName,
    status = 204,
    repeat = 1
  }: {deployId?: string; clientName?: string; status?: number; repeat?: number} = {}): ObservableApiMock {
    const response = status == 204 ? "" : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) => {
      pool
        .intercept({
          path: `/cli/deploy/${deployId}/file`,
          method: "POST",
          headers: headersMatcher(headers),
          body: clientName === undefined ? undefined : formDataMatcher({client_name: clientName})
        })
        .reply(status, response)
        .times(repeat);
    });
    return this;
  }

  handlePostDeployUploaded({deployId, status = 200}: {deployId?: string; status?: number} = {}): ObservableApiMock {
    const response =
      status == 200
        ? JSON.stringify({
            id: deployId,
            status: "uploaded",
            url: `${getObservableUiOrigin()}/@mock-user-ws/test-project`
          })
        : emptyErrorBody;
    const headers = authorizationHeader(status !== 403);
    this.addHandler((pool) =>
      pool
        .intercept({path: `/cli/deploy/${deployId}/uploaded`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handleGetDeploy({
    deployId,
    deployStatus = "uploaded",
    status = 200
  }: {
    deployId: string;
    deployStatus?: string;
    status?: number;
  }): ObservableApiMock {
    const response = status === 200 ? JSON.stringify({id: deployId, status: deployStatus}) : emptyErrorBody;
    const headers = authorizationHeader(status !== 401);
    this._handlers.push((pool) =>
      pool
        .intercept({path: `/cli/deploy/${deployId}`, headers: headersMatcher(headers)})
        .reply(status, response, {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handlePostAuthRequest(confirmationCode = "FAKEPASS"): ObservableApiMock {
    const response: PostAuthRequestResponse = {
      confirmationCode,
      id: "authRequestId"
    };
    this.addHandler((pool) =>
      pool
        .intercept({
          path: "/cli/auth/request",
          method: "POST",
          body: (body) => {
            const data = JSON.parse(body);
            return Array.isArray(data.scopes) && typeof data.deviceDescription === "string";
          },
          headers: headersMatcher({"User-Agent": /.+/})
        })
        .reply(200, JSON.stringify(response), {headers: {"content-type": "application/json"}})
    );
    return this;
  }

  handlePostAuthRequestPoll(
    status: "pending" | "accepted" | "expired" | "consumed",
    apiKey?: PostAuthRequestPollResponse["apiKey"]
  ): ObservableApiMock {
    const response: PostAuthRequestPollResponse = {
      status,
      apiKey: status === "accepted" ? apiKey ?? {id: "apiKey1234", key: validApiKey} : null
    };
    this.addHandler((pool) =>
      pool
        .intercept({
          path: "/cli/auth/request/poll",
          method: "POST"
        })
        .reply(200, JSON.stringify(response), {headers: {"content-type": "application/json"}})
    );
    return this;
  }
}

function authorizationHeader(valid: boolean) {
  return {authorization: valid ? `apikey ${validApiKey}` : `apikey ${invalidApiKey}`};
}

/** All headers in `expected` must be present and have the expected value.
 *
 * If `expected` contains an "undefined" value, then it asserts that the header
 * is not present in the actual headers. */
function headersMatcher(expected: Record<string, string | RegExp>): (headers: Record<string, string>) => boolean {
  const lowercaseExpected = Object.fromEntries(Object.entries(expected).map(([key, val]) => [key.toLowerCase(), val]));
  return (actual) => {
    const lowercaseActual = Object.fromEntries(Object.entries(actual).map(([key, val]) => [key.toLowerCase(), val]));
    for (const [key, expected] of Object.entries(lowercaseExpected)) {
      if (typeof expected === "string" && lowercaseActual[key] !== expected) return false;
      if (expected instanceof RegExp && !lowercaseActual[key].match(expected)) return false;
    }
    return true;
  };
}

function formDataMatcher(expected: Record<string, string>): (body: string) => boolean {
  // actually FormData, not string
  return (actual: any) => {
    for (const key in expected) {
      if (!(actual.get(key) === expected[key])) {
        return false;
      }
    }
    return true;
  };
}

const userBase = {
  id: "0000000000000000",
  login: "mock-user",
  name: "Mock User",
  tier: "public",
  has_workspace: false
};

const workspaces: GetCurrentUserResponse["workspaces"] = [
  {
    id: "0000000000000001",
    login: "mock-user-ws",
    name: "Mock User's Workspace",
    tier: "pro_2024",
    type: "team",
    role: "member",
    projects_info: []
  },
  {
    id: "0000000000000002",
    login: "mock-user-ws-2",
    name: "Mock User Second Workspace",
    tier: "pro_2024",
    type: "team",
    role: "owner",
    projects_info: []
  },
  {
    id: "0000000000000003",
    login: "mock-user-ws-3",
    name: "Mock User's Third Workspace Wrong Tier",
    tier: "pro_2024",
    type: "team",
    role: "viewer",
    projects_info: []
  },
  {
    id: "0000000000000004",
    login: "mock-user-ws-4",
    name: "Mock User's Fourth Workspace Guest Member as Editor",
    tier: "pro_2024",
    type: "team",
    role: "guest_member",
    projects_info: [{project_slug: "test-project-1", project_role: "editor"}]
  },
  {
    id: "0000000000000005",
    login: "mock-user-ws-5",
    name: "Mock User's Fifth Workspace Guest Member as Viewer",
    tier: "pro_2024",
    type: "team",
    role: "guest_member",
    projects_info: [{project_slug: "test-project-2", project_role: "viewer"}]
  }
];

export const userWithZeroWorkspaces = {
  ...userBase,
  workspaces: []
};

export const userWithOneWorkspace = {
  ...userBase,
  workspaces: workspaces.slice(0, 1)
};

export const userWithTwoWorkspaces = {
  ...userBase,
  workspaces: workspaces.slice(0, 2)
};

export const userWithGuestMemberWorkspaces = {
  ...userBase,
  workspaces
};

class FilteringPendingInterceptorFormatter extends PendingInterceptorsFormatter {
  constructor(private readonly _origin: string) {
    super();
  }

  format(interceptors: readonly {origin: string}[]) {
    return super.format(interceptors.filter((i) => i.origin === this._origin));
  }
}
