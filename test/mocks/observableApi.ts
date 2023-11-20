import {type Dispatcher, type Interceptable, MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {getObservableApiHost} from "../../src/auth.js";

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

  public handleWhoAmIValid(): ObservableApiMock {
    this._handlers.push((pool) =>
      pool
        .intercept({
          path: "/cli/user",
          headers: headersMatcher({authorization: "apikey MOCK-VALID-KEY"})
        })
        .reply(
          200,
          JSON.stringify({
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
        )
    );
    return this;
  }

  public handleWhoAmIInvalid(): ObservableApiMock {
    this._handlers.push((pool) =>
      pool
        .intercept({
          path: "/cli/user",
          headers: headersMatcher({authorization: "apikey MOCK-INVALID-KEY"})
        })
        .reply(401, "Unauthorized")
    );
    return this;
  }
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
