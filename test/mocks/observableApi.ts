import {type Dispatcher, type Interceptable, MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {getObservableApiHost} from "../../src/observableApiClient.js";

export const validApiKey = "MOCK-VALID-KEY";
export const invalidApiKey = "MOCK-INVALID-KEY";
const emptyErrorBody = JSON.stringify({errors: []});
export class ObservableApiMock {
  private _agent: MockAgent | null = null;
  private _handlers: ((pool: Interceptable) => void)[] = [];
  private _originalDispatcher: Dispatcher | null = null;

  public start(): ObservableApiMock {
    this._agent = new MockAgent();
    this._agent.disableNetConnect();
    const origin = getObservableApiHost().toString().replace(/\/$/, "");
    const mockPool = this._agent.get(origin);
    for (const handler of this._handlers) handler(mockPool);
    this._originalDispatcher = getGlobalDispatcher();
    setGlobalDispatcher(this._agent);
    return this;
  }

  public close() {
    if (!this._agent) throw new Error("ObservableApiMock not started");
    this._agent.assertNoPendingInterceptors();
    this._agent.close();
    this._agent = null;
    if (this._originalDispatcher) {
      setGlobalDispatcher(this._originalDispatcher);
      this._originalDispatcher = null;
    }
  }

  handleGetUser({valid = true}: {valid?: boolean} = {valid: true}): ObservableApiMock {
    const status = valid ? 200 : 401;
    const response = valid
      ? JSON.stringify({
          id: "0000000000000000",
          login: "mock-user",
          name: "Mock User",
          tier: "public",
          has_workspace: false,
          workspaces: [
            {
              id: "0000000000000001",
              login: "mock-user-ws",
              name: "Mock User's Workspace",
              tier: "pro",
              type: "team",
              role: "owner"
            }
          ]
        })
      : emptyErrorBody;
    const headers = authorizationHeader(valid);
    this._handlers.push((pool) =>
      pool.intercept({path: "/cli/user", headers: headersMatcher(headers)}).reply(status, response)
    );
    return this;
  }

  handlePostProject(
    {projectId, valid = true}: {projectId?: string; valid?: boolean} = {valid: true}
  ): ObservableApiMock {
    const status = valid ? 200 : 401;
    const response = valid ? JSON.stringify({id: projectId}) : emptyErrorBody;
    const headers = authorizationHeader(valid);
    this._handlers.push((pool) =>
      pool.intercept({path: "/cli/project", method: "POST", headers: headersMatcher(headers)}).reply(status, response)
    );
    return this;
  }

  handlePostDeploy(
    {projectId, deployId, valid = true}: {projectId?: string; deployId?: string; valid?: boolean} = {valid: true}
  ): ObservableApiMock {
    const status = valid ? 200 : 401;
    const response = valid ? JSON.stringify({id: deployId}) : emptyErrorBody;
    const headers = authorizationHeader(valid);
    this._handlers.push((pool) =>
      pool
        .intercept({path: `/cli/project/${projectId}/deploy`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response)
    );
    return this;
  }

  handlePostDeployFile(
    {deployId, valid = true}: {deployId?: string; valid?: boolean} = {valid: true}
  ): ObservableApiMock {
    const status = valid ? 204 : 401;
    const response = valid ? "" : emptyErrorBody;

    const headers = authorizationHeader(valid);
    this._handlers.push((pool) =>
      pool
        .intercept({path: `/cli/deploy/${deployId}/file`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response)
    );
    return this;
  }

  handlePostDeployUploaded(
    {deployId, valid = true}: {deployId?: string; valid?: boolean} = {valid: true}
  ): ObservableApiMock {
    const status = valid ? 204 : 401;
    const response = valid ? JSON.stringify({id: deployId, status: "uploaded"}) : emptyErrorBody;
    const headers = authorizationHeader(valid);
    this._handlers.push((pool) =>
      pool
        .intercept({path: `/cli/deploy/${deployId}/uploaded`, method: "POST", headers: headersMatcher(headers)})
        .reply(status, response)
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
function headersMatcher(expected: Record<string, string>): (headers: Record<string, string>) => boolean {
  const lowercaseExpected = Object.fromEntries(Object.entries(expected).map(([key, val]) => [key.toLowerCase(), val]));
  return (actual) => {
    const lowercaseActual = Object.fromEntries(Object.entries(actual).map(([key, val]) => [key.toLowerCase(), val]));
    for (const [key, expected] of Object.entries(lowercaseExpected)) {
      if (lowercaseActual[key] !== expected) return false;
    }
    return true;
  };
}
