import assert from "node:assert";
import {fromOsPath, toOsPath} from "../src/files.js";
import {loadUserConfig} from "../src/observableApiConfig.js";
import {MockConfigEffects} from "./mocks/configEffects.js";

describe("loadUserConfig", () => {
  it("checks expected directories for the config", async () => {
    const effects = new MockConfigEffects();
    assert.deepEqual(await loadUserConfig(effects), {
      config: {},
      configPath: toOsPath("/home/amaya/.observablehq")
    });
    assert.deepEqual(
      effects._readLog.map((p) => fromOsPath(p).replace(/^[a-z]:/i, "")), // remove Windows driver letter
      [
        "/opt/projects/acme-bi/.observablehq",
        "/opt/projects/.observablehq",
        "/opt/.observablehq",
        "/.observablehq",
        "/home/amaya/.observablehq"
      ]
    );
    assert.deepEqual(effects._writeLog, []);
  });
});
