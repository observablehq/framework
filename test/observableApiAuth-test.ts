import assert from "node:assert";
import {commandRequiresAuthenticationMessage} from "../src/commandInstruction.js";
import {type AuthEffects, login, logout, whoami} from "../src/observableApiAuth.js";
import {MockLogger} from "./mocks/logger.js";
import {getCurentObservableApi, mockObservableApi} from "./mocks/observableApi.js";
import {MockConfigEffects} from "./observableApiConfig-test.js";

describe("login command", () => {
  it("works", async () => {
    const effects = new MockAuthEffects();
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
      assert.deepEqual(await effects.setApiKeyDeferred.promise, {id: "MOCK-ID", key: "MOCK-KEY"});
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
    const effects = new MockAuthEffects({isTty: false});
    const server = await login(effects);
    if (server.isRunning) {
      await server.stop();
      assert.ok(!server.isRunning, "server should have shut down automatically");
    }
    effects.logger.assertExactLogs([/^Open this link in your browser/, /^\s*https:/]);
  });
});

describe("logout command", () => {
  it("removes the API key from the config", async () => {
    const effects = new MockAuthEffects({apiKey: "original-key"});
    await logout(effects);
    assert.equal(effects.observableApiKey, null);
    assert.equal(await effects.setApiKeyDeferred.promise, undefined);
    effects.logger.assertExactLogs([]);
  });
});

describe("whoami command", () => {
  mockObservableApi();

  it("errors when there is no API key", async () => {
    const effects = new MockAuthEffects({apiKey: null});
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
    getCurentObservableApi().handleGetUser({status: 401}).start();
    const effects = new MockAuthEffects({apiKey: "MOCK-INVALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([/^Your API key is invalid/]);
  });

  it("works when there is a valid API key", async () => {
    getCurentObservableApi().handleGetUser().start();
    const effects = new MockAuthEffects({apiKey: "MOCK-VALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([
      /^You are logged into.*as Mock User/,
      /^You have access to the following workspaces/,
      /Mock User's Workspace/
    ]);
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

class MockAuthEffects extends MockConfigEffects implements AuthEffects {
  public logger = new MockLogger();
  public openBrowserDeferred = new Deferred<string>();
  public setApiKeyDeferred = new Deferred<{id: string; apiKey: string}>();
  public exitDeferred = new Deferred<void>();
  public isTty: boolean;
  public observableApiKey: string | null = null;

  constructor({apiKey = null, isTty = true}: {apiKey?: string | null; isTty?: boolean} = {}) {
    super();
    this.observableApiKey = apiKey;
    this.isTty = isTty;
  }

  async getObservableApiKey(effects: AuthEffects = this) {
    if (effects !== this) throw new Error("don't pass unrelated effects to mock effects methods");
    if (!this.observableApiKey) {
      effects.logger.log(commandRequiresAuthenticationMessage);
      throw new Error("no key available in this test");
    }
    return {source: "test" as const, key: this.observableApiKey};
  }
  async setObservableApiKey(info) {
    this.setApiKeyDeferred.resolve(info);
    this.observableApiKey = info?.key;
  }
  openUrlInBrowser(url: string) {
    this.openBrowserDeferred.resolve(url);
    return Promise.resolve(undefined);
  }
  waitForEnter() {
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
