import assert from "node:assert";
import {commandRequiresAuthenticationMessage} from "../src/commandInstruction.js";
import {CliError} from "../src/error.js";
import {type AuthEffects, login, logout, whoami} from "../src/observableApiAuth.js";
import {MockLogger} from "./mocks/logger.js";
import {getCurentObservableApi, mockObservableApi} from "./mocks/observableApi.js";
import {MockConfigEffects} from "./observableApiConfig-test.js";

describe("login command", () => {
  mockObservableApi();

  it("works", async () => {
    const effects = new MockAuthEffects();
    assert.equal(effects.observableApiKey, null);
    getCurentObservableApi()
      .handlePostAuthRequest("FAKEPASS")
      .handlePostAuthRequestPoll("accepted", {id: "MOCK-ID", key: "MOCK-KEY"})
      .start();

    await login(effects);
    assert.deepEqual(await effects.setApiKeyDeferred.promise, {id: "MOCK-ID", key: "MOCK-KEY"});
    assert.equal(effects.observableApiKey, "MOCK-KEY");
    effects.logger.assertAtLeastLogs([/.*copy your confirmation code.*FAKEPASS.*\/settings\/api-keys\/confirm.*/ms]);
  });

  it("polls until the key is accepted", async () => {
    // This test involves waiting a second for two poll cycles. Maybe we should mock time, or make the interval configurable?
    const effects = new MockAuthEffects();
    getCurentObservableApi()
      .handlePostAuthRequest("FAKEPASS")
      .handlePostAuthRequestPoll("pending")
      .handlePostAuthRequestPoll("accepted", {id: "MOCK-ID", key: "MOCK-KEY"})
      .start();

    await login(effects);
    assert.equal(effects.observableApiKey, "MOCK-KEY");
  }).timeout(3000);

  it("handles expired requests", async () => {
    const effects = new MockAuthEffects();
    getCurentObservableApi().handlePostAuthRequest("FAKEPASS").handlePostAuthRequestPoll("expired").start();

    try {
      await login(effects);
      assert.fail("expected failure");
    } catch (error) {
      CliError.assert(error, {message: "That confirmation code expired. Please try again."});
    }
    assert.equal(effects.observableApiKey, null);
  });

  it("handles consumed requests", async () => {
    const effects = new MockAuthEffects();
    getCurentObservableApi().handlePostAuthRequest("FAKEPASS").handlePostAuthRequestPoll("consumed").start();

    try {
      await login(effects);
      assert.fail("expected failure");
    } catch (error) {
      CliError.assert(error, {message: "That confirmation code has already been used. Please try again."});
    }
    assert.equal(effects.observableApiKey, null);
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
  public outputColumns: number = 80;

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
