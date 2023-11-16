import {type RequestHandler, type ResponseResolver, http, HttpResponse} from "msw";
import {type SetupServer, setupServer} from "msw/node";
import {getObservableApiHost} from "../../src/auth.js";

export class ObservableApiMock {
  private _server: null | SetupServer = null;
  private _handlers: RequestHandler[] = [];

  public start(): ObservableApiMock {
    this._server = setupServer(...this._handlers);
    this._server.listen({onUnhandledRequest: "error"});
    return this;
  }

  public close() {
    if (!this._server) throw new Error("ObservableApiMock not started");
    this._server.close();
    this._server = null;
  }

  public handleWhoAmI(): ObservableApiMock {
    const baseUrl = getObservableApiHost();
    this._handlers.push(http.get(new URL("/cli/user", baseUrl).toString(), handlerGetCliUser));
    return this;
  }
}

const handlerGetCliUser: ResponseResolver = ({request}) => {
  const authorization = request.headers.get("authorization");
  if (authorization === `apikey MOCK-VALID-KEY`) {
    return HttpResponse.json({
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
    });
  } else if (authorization === "apikey MOCK-INVALID-KEY") {
    return HttpResponse.text("Unauthorized", {status: 401});
  } else {
    throw new Error(`unexpected mock API key: ${JSON.stringify(authorization)}`);
  }
};
