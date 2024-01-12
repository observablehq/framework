import assert from "assert";
import {randomUUID} from "crypto";
import {MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {Telemetry} from "../src/telemetry.js";
import {MockLogger} from "./mocks/logger.js";

describe("telemetry", () => {
  const globalDispatcher = getGlobalDispatcher();
  let agent;

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    agent.get("https://events.observablehq.com").intercept({path: "/cli", method: "POST"}).reply(204);
    setGlobalDispatcher(agent);
  });
  afterEach(() => {
    setGlobalDispatcher(globalDispatcher);
  });

  const noopEffects = {env: {}, logger: new MockLogger(), getPersistentId: async () => randomUUID()};

  it("sends data", async () => {
    Telemetry.init(noopEffects);
    Telemetry.record({event: "build", step: "start", test: true});
    await Telemetry.flush();
    agent.assertNoPendingInterceptors();
  });

  it("shows a banner", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({
      ...noopEffects,
      logger,
      getPersistentId: async (name, generator = randomUUID) => generator()
    });
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.flush();
    logger.assertExactErrors([/Attention.*telemetry.*https:\/\/cli.observablehq.com/s]);
  });

  it("can be disabled", async () => {
    const telemetry = new Telemetry({...noopEffects, env: {OBSERVABLE_TELEMETRY_DISABLE: "1"}});
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.flush();
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("debug prints data and disables", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({...noopEffects, env: {OBSERVABLE_TELEMETRY_DEBUG: "1"}, logger});
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.flush();
    assert.equal(logger.errorLines.length, 1);
    assert.equal(logger.errorLines[0][0], "[telemetry]");
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("eliminates IDs if they can't be persisted", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({
      ...noopEffects,
      env: {OBSERVABLE_TELEMETRY_DEBUG: "1"},
      logger,
      getPersistentId: () => Promise.resolve(null)
    });
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.flush();
    assert.notEqual(logger.errorLines[0][1].ids.session, null);
    assert.equal(logger.errorLines[0][1].ids.device, null);
    assert.equal(logger.errorLines[0][1].ids.project, null);
  });

  it("silent on error", async () => {
    const logger = new MockLogger();
    agent.get("https://invalid.").intercept({path: "/cli", method: "POST"}).replyWithError(new Error("silent"));
    const telemetry = new Telemetry({...noopEffects, env: {OBSERVABLE_TELEMETRY_ORIGIN: "https://invalid."}, logger});
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.flush();
    assert.equal(logger.errorLines.length, 0);
    assert.equal(agent.pendingInterceptors().length, 1);
  });
});
