import {type Dispatcher, type Interceptable, MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import packageJson from "../../package.json";
import {getObservableApiHost} from "../../src/auth.js";

const BASE_HEADERS = {
  Accept: "application/json",
  "User-Agent": `Observable CLI ${packageJson.version}`,
  "X-Observable-Api-Version": "2023-11-06"
};

export class ObservableApiMock {
  private _handlers: ((pool: Interceptable) => void)[] = [];
  private _agent: MockAgent | null = null;
  private _originalDispatcher: Dispatcher | null = null;

  public start(): ObservableApiMock {
    this._agent = new MockAgent();
    setGlobalDispatcher(this._agent);

    // MockPool
    const mockPool = this._agent.get(getObservableApiHost().toString());
    mockPool.intercept({path: /.*/}).reply(200, "foo");

    this._agent.disableNetConnect();
    // this._originalDispatcher = getGlobalDispatcher();
    // setGlobalDispatcher(this._agent);

    // const mockPool = this._agent.get(getObservableApiHost().toString());
    // console.log(this._handlers);
    // for (const handler of this._handlers) {
    //   handler(mockPool);
    // }

    return this;
  }

  public close() {
    // if (!this._agent) throw new Error("ObservableApiMock not started");
    // this._agent.assertNoPendingInterceptors();
    // this._agent.close();
    // this._agent = null;
    // if (this._originalDispatcher) {
    //   setGlobalDispatcher(this._originalDispatcher);
    //   this._originalDispatcher = null;
    // }
  }

  public handleWhoAmIValid(): ObservableApiMock {
    this._handlers.push((pool) =>
      pool
        .intercept({
          path: "/cli/user",
          method: "GET",
          headers: {
            ...BASE_HEADERS,
            Authorization: "apikey MOCK-VALID-KEY"
          }
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
    this._handlers.push((pool) => {
      console.log("adding whoami invalid intercept");
      pool.intercept({path: /.*/}).reply(200, "foo");
    });
    //   pool
    //     .intercept({path: /.*/})
    //     // .intercept({
    //     //   path: (...args) => {
    //     //     console.log("intercept", ...args);
    //     //     return false;
    //     //   }
    //     // })
    //     // .intercept(
    //     // .intercept({
    //     //   path: "/cli/user"
    //     //   // method: "GET",
    //     //   // headers: {
    //     //   //   ...BASE_HEADERS,
    //     //   //   "User-Agent": `Observable CLI ${packageJson.version}`
    //     //   // }
    //     // })
    //     .reply(401, "Unauthorized")
    // );
    return this;
  }
}
