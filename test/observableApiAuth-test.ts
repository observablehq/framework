import assert from "node:assert";
import {commandRequiresAuthenticationMessage} from "../src/commandInstruction.js";
import {CliError} from "../src/error.js";
import {login, logout, whoami} from "../src/observableApiAuth.js";
import {MockAuthEffects} from "./mocks/authEffects.js";
import {getCurrentObservableApi, mockObservableApi, validApiKey} from "./mocks/observableApi.js";

describe("login command", () => {
  mockObservableApi();

  it("works", async () => {
    const effects = new MockAuthEffects();
    assert.equal(effects.observableApiKey, null);
    getCurrentObservableApi()
      .handlePostAuthRequest("FAKEPASS")
      .handlePostAuthRequestPoll("accepted", {id: "MOCK-ID", key: validApiKey})
      .handleGetCurrentUser()
      .start();

    await login(effects, {pollTime: 10});
    assert.deepEqual(await effects.setApiKeyDeferred.promise, {id: "MOCK-ID", key: validApiKey});
    assert.equal(effects.observableApiKey, validApiKey);
    effects.clack.log.assertLogged({
      message: /.*Your confirmation code.*FAKEPASS.*\/auth-device.*/ms
    });
  });

  it("polls until the key is accepted", async () => {
    // This test involves waiting a second for two poll cycles. Maybe we should mock time, or make the interval configurable?
    const effects = new MockAuthEffects();
    getCurrentObservableApi()
      .handlePostAuthRequest("FAKEPASS")
      .handlePostAuthRequestPoll("pending")
      .handlePostAuthRequestPoll("accepted", {id: "MOCK-ID", key: validApiKey})
      .handleGetCurrentUser()
      .start();

    await login(effects, {pollTime: 10});
    assert.equal(effects.observableApiKey, validApiKey);
  }).timeout(3000);

  it("handles expired requests", async () => {
    const effects = new MockAuthEffects();
    getCurrentObservableApi().handlePostAuthRequest("FAKEPASS").handlePostAuthRequestPoll("expired").start();

    try {
      await login(effects, {pollTime: 10});
      assert.fail("expected failure");
    } catch (error) {
      CliError.assert(error, {message: "That confirmation code expired."});
    }
    assert.equal(effects.observableApiKey, null);
  });

  it("handles consumed requests", async () => {
    const effects = new MockAuthEffects();
    getCurrentObservableApi().handlePostAuthRequest("FAKEPASS").handlePostAuthRequestPoll("consumed").start();

    try {
      await login(effects, {pollTime: 10});
      assert.fail("expected failure");
    } catch (error) {
      CliError.assert(error, {message: "That confirmation code has already been used."});
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
    effects.logger.assertExactLogs([/^You are now logged out of/]);
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
      CliError.assert(err, {message: commandRequiresAuthenticationMessage});
    }
  });

  it("works when there is an API key that is invalid", async () => {
    getCurrentObservableApi().handleGetCurrentUser({status: 401}).start();
    const effects = new MockAuthEffects({apiKey: "MOCK-INVALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([/^Your API key is invalid/]);
  });

  it("works when there is a valid API key", async () => {
    getCurrentObservableApi().handleGetCurrentUser().start();
    const effects = new MockAuthEffects({apiKey: "MOCK-VALID-KEY"});
    await whoami(effects);
    effects.logger.assertExactLogs([
      /^You are logged into.*as Mock User/,
      /^You have access to the following workspaces/,
      /Mock User's Workspace/
    ]);
  });
});
