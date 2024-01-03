import assert from "node:assert";
import type {Logger} from "../src/logger.js";
import {type CommandEffects, commandRequiresAuthenticationMessage, login, whoami} from "../src/observableApiAuth.js";
import {MockLogger} from "./mocks/logger.js";
import {ObservableApiMock} from "./mocks/observableApi.js";

describe("login command", () => {
  it("works", async () => {
    const effects = new MockEffects();
    // start the login process
    const loginPromise = login(effects);
    try {
      // it should open a browser window
      const url = await effects.openBrowserDeferred.promise;
      await loginPromise;
      const generateRequest = decodeGenerateRequest(url);

      // The user interacts with the opened page, and eventually it sends a request back to the CLI
      const sendApiKeyResponse = await fetch(`http://localhost:${generateRequest.port}/api-key`, {
        method: "POST",
        headers: {
          origin: "https://observablehq.com"
        },
        body: JSON.stringify({
          nonce: generateRequest.nonce,
          id: "MOCK-ID",
          key: "MOCK-KEY"
        })
      });
      assert.equal(sendApiKeyResponse.status, 201);
      // The CLI then writes the API key to the config file
      assert.deepEqual(await effects.setApiKeyDeferred.promise, {id: "MOCK-ID", apiKey: "MOCK-KEY"});
      effects.logger.assertExactLogs([/^Press Enter to open/, /^Successfully logged in/]);
      await effects.exitDeferred.promise;
    } finally {
      // this prevents the tests from hanging in case the test fails
      const server = await loginPromise;
      if (server.isRunning) {
        await server.stop();
        assert.ok(!server.isRunning, "server should have shut down automatically");
      }
    }
  });

  it("gives a manual link when not on a tty", async () => {
    const effects = new MockEffects({isTty: false});
    const server = await login(effects);
    if (server.isRunning) {
      await server.stop();
      assert.ok(!server.isRunning, "server should have shut down automatically");
    }
    effects.logger.assertExactLogs([/^Open this link in your browser/, /^\s*https:/]);
  });
});

describe("whoami command", () => {
  it("errors when there is no API key", async () => {
    const effects = new MockEffects({apiKey: null});
    try {
      await whoami(effects);
      assert.fail("error expected");
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      assert.equal(err.message, "no key available in this test");
      effects.logger.assertExactLogs([/^You need to be authenticated/]);
    }
  });

  it("works when there is an API key that is invalid", async () => {
    const mock = new ObservableApiMock().handleGetUser({status: 401}).start();
    const effects = new MockEffects({apiKey: "MOCK-INVALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([/^Your API key is invalid/]);
    mock.close();
  });

  it("works when there is a valid API key", async () => {
    const mock = new ObservableApiMock().handleGetUser().start();
    const effects = new MockEffects({apiKey: "MOCK-VALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([
      /^You are logged into.*as Mock User/,
      /^You have access to the following workspaces/,
      /Mock User's Workspace/
    ]);
    mock.close();
  });
});

class Deferred<T = unknown> {
  promise: Promise<T>;
  resolve!: (value: T) => void;
  reject!: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class MockEffects implements CommandEffects {
  public logger = new MockLogger();
  public openBrowserDeferred = new Deferred<string>();
  public setApiKeyDeferred = new Deferred<{id: string; apiKey: string}>();
  public exitDeferred = new Deferred<void>();
  public isTty: boolean;
  public _observableApiKey: string | null = null;

  constructor({apiKey = null, isTty = true}: {apiKey?: string | null; isTty?: boolean} = {}) {
    this._observableApiKey = apiKey;
    this.isTty = isTty;
  }

  getObservableApiKey(logger: Logger) {
    if (!this._observableApiKey) {
      logger.log(commandRequiresAuthenticationMessage);
      throw new Error("no key available in this test");
    }
    return Promise.resolve({source: "test" as const, key: this._observableApiKey});
  }
  openUrlInBrowser(url: string) {
    this.openBrowserDeferred.resolve(url);
    return Promise.resolve(undefined);
  }
  waitForEnter() {
    return Promise.resolve(undefined);
  }
  setObservableApiKey(id: string, apiKey: string) {
    this.setApiKeyDeferred.resolve({id, apiKey});
    this._observableApiKey = apiKey;
    return Promise.resolve(undefined);
  }
  exitSuccess() {
    this.exitDeferred.resolve(undefined);
  }
}

function decodeGenerateRequest(urlString: string): {nonce: string; port: number} {
  const url = new URL(urlString);
  const encodedRequest = url.searchParams.get("request");
  if (!encodedRequest) throw new Error("missing request parameter");
  const buf = Buffer.from(encodedRequest, "base64");
  return JSON.parse(new TextDecoder().decode(buf));
}
