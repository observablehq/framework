import assert from "assert";
import type {readFile} from "fs/promises";
import {MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import {Telemetry} from "../src/telemetry.js";
import {MockLogger} from "./mocks/logger.js";

describe("telemetry", () => {
  const globalDispatcher = getGlobalDispatcher();
  let agent: MockAgent;

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    agent.get("https://events.observablehq.com").intercept({path: "/cli", method: "POST"}).reply(204);
    setGlobalDispatcher(agent);
  });
  afterEach(() => {
    setGlobalDispatcher(globalDispatcher);
  });

  const processMock = (mock: any) => Object.assign(Object.create(process), mock);

  const noopEffects = {
    logger: new MockLogger(),
    readFile: (async () => JSON.stringify({cli_telemetry_banner: 1})) as unknown as typeof readFile,
    writeFile: async () => {},
    process: processMock({env: {}})
  };

  it("sends data", async () => {
    Telemetry._instance = new Telemetry(noopEffects);
    Telemetry.record({event: "build", step: "start", test: true});
    await Telemetry.instance.pending;
    agent.assertNoPendingInterceptors();
  });

  it("shows a banner", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({...noopEffects, logger, readFile: () => Promise.reject()});
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.pending;
    logger.assertExactErrors([/Attention.*observablehq.com.*OBSERVABLE_TELEMETRY_DISABLE=true/s]);
  });

  it("can be disabled", async () => {
    const telemetry = new Telemetry({...noopEffects, process: processMock({env: {OBSERVABLE_TELEMETRY_DISABLE: "1"}})});
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.pending;
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("debug prints data and disables", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({
      ...noopEffects,
      logger,
      process: processMock({env: {OBSERVABLE_TELEMETRY_DEBUG: "1"}})
    });
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.pending;
    assert.equal(logger.errorLines.length, 1);
    assert.equal(logger.errorLines[0][0], "[telemetry]");
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("eliminates IDs if they can't be persisted", async () => {
    const logger = new MockLogger();
    const telemetry = new Telemetry({
      ...noopEffects,
      logger,
      process: processMock({env: {OBSERVABLE_TELEMETRY_DEBUG: "1"}}),
      writeFile: () => Promise.reject()
    });
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.pending;
    assert.notEqual(logger.errorLines[0][1].ids.session, null);
    assert.equal(logger.errorLines[0][1].ids.device, null);
    assert.equal(logger.errorLines[0][1].ids.project, null);
  });

  it("stays silent on fetch errors", async () => {
    const logger = new MockLogger();
    agent.get("https://invalid.").intercept({path: "/cli", method: "POST"}).replyWithError(new Error("silent"));
    const telemetry = new Telemetry({
      ...noopEffects,
      logger,
      process: processMock({env: {OBSERVABLE_TELEMETRY_ORIGIN: "https://invalid."}})
    });
    telemetry.record({event: "build", step: "start", test: true});
    await telemetry.pending;
    assert.equal(logger.errorLines.length, 0);
    assert.equal(agent.pendingInterceptors().length, 1);
  });

  it("throws when origin is explicitly misconfigured", async () => {
    assert.throws(() => {
      new Telemetry({
        ...noopEffects,
        process: processMock({env: {OBSERVABLE_TELEMETRY_ORIGIN: "☃️"}})
      });
    }, /OBSERVABLE_TELEMETRY_ORIGIN: ☃️/);
  });

  it("saves a signal record on exit", async () => {
    const logger = new MockLogger();
    const listeners = {};
    let kill: (value: unknown) => void;
    const killed = new Promise((resolve) => (kill = resolve));
    new Telemetry({
      ...noopEffects,
      logger,
      process: processMock({
        env: {OBSERVABLE_TELEMETRY_DEBUG: "1"},
        on(event, listener) {
          listeners[event] = listener;
          return this;
        },
        kill(pid: number, signal?: string) {
          kill(signal);
          throw new Error("exit");
        }
      })
    });
    listeners["SIGINT"]("SIGINT");
    assert.equal(await killed, "SIGINT");
    assert.equal(logger.errorLines.length, 1);
    assert.deepEqual(logger.errorLines[0][1].data, {event: "signal", signal: "SIGINT"});
  });
});
