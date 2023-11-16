import assert from "node:assert";
import {type CommandEffects, login, whoami} from "../src/auth.js";
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
      effects._assertExactLogs([/^Successfully logged in/]);
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
});

describe("whoami command", () => {
  it("works when there is no API key", async () => {
    const effects = new MockEffects({apiKey: null});
    await whoami(effects);
    effects._assertExactLogs([/^You haven't authenticated with/]);
  });

  it("works when there is an API key that is invalid", async () => {
    const mock = new ObservableApiMock().handleWhoAmI().start();
    const effects = new MockEffects({apiKey: "MOCK-INVALID-KEY"});
    await whoami(effects);
    effects._assertExactLogs([/^Your API key is invalid/]);
    mock.close();
  });

  it("works when there is a valid API key", async () => {
    const mock = new ObservableApiMock().handleWhoAmI().start();
    const effects = new MockEffects({apiKey: "MOCK-VALID-KEY"});
    await whoami(effects);
    effects._assertExactLogs([
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
  public logLines: any[][] = [];
  public openBrowserDeferred = new Deferred<string>();
  public setApiKeyDeferred = new Deferred<{id: string; apiKey: string}>();
  public exitDeferred = new Deferred<void>();
  public _observableApiKey: string | null = null;

  constructor({apiKey = null}: {apiKey?: string | null} = {}) {
    this._observableApiKey = apiKey;
  }

  _assertExactLogs(expected: RegExp[], {skipBlanks = true} = {}) {
    const filteredLogs = this.logLines.filter((logArgs) => {
      if (skipBlanks) return logArgs.length > 0;
      return true;
    });

    for (let i = 0; i < expected.length; i++) {
      const logArgs = filteredLogs[i];
      assert.equal(logArgs.length, 1, "Only know how to assert log lines with a single argument");
      assert.ok(
        logArgs[0].match(expected[i]),
        `Expected log line ${i} to match ${expected[i]}, but got ${JSON.stringify(logArgs[0])}`
      );
    }
  }

  getObservableApiKey() {
    return Promise.resolve(this._observableApiKey);
  }
  isatty() {
    return true;
  }
  log(...args: any[]) {
    this.logLines.push(args);
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
