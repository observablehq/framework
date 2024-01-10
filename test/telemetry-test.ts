import assert from "assert";
import {MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {Telemetry} from "../src/telemetry.js";

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
    delete process.env.OBSERVABLE_TELEMETRY_DISABLE;
    delete process.env.OBSERVABLE_TELEMETRY_DEBUG;
    delete process.env.OBSERVABLE_TELEMETRY_ORIGIN;
  });

  it("sends data", async () => {
    const telemetry = new Telemetry();
    telemetry.record({event: "build", step: "start"});
    await telemetry.flush();
    agent.assertNoPendingInterceptors();
  });

  it("can be disabled", async () => {
    process.env.OBSERVABLE_TELEMETRY_DISABLE = "1";
    const telemetry = new Telemetry();
    telemetry.record({event: "build", step: "start"});
    await telemetry.flush();
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("can be disabled via debug", async () => {
    process.env.OBSERVABLE_TELEMETRY_DEBUG = "1";
    const telemetry = new Telemetry();
    telemetry.record({event: "build", step: "start"});
    await telemetry.flush();
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("silent on error", async () => {
    process.env.OBSERVABLE_TELEMETRY_ORIGIN = "https://localhost";
    agent.get("https://localhost").intercept({path: "/cli", method: "POST"}).replyWithError(new Error("silent"));
    const telemetry = new Telemetry();
    telemetry.record({event: "build", step: "start"});
    await telemetry.flush();
    assert.equal(agent.pendingInterceptors().length, 1);
  });
});
