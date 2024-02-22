import assert from "node:assert";
import os from "node:os";
import {type FilePath, fileJoin} from "../src/brandedPath.js";
import type {ConfigEffects} from "../src/observableApiConfig.js";
import {loadUserConfig} from "../src/observableApiConfig.js";

const isWindows = os.platform() === "win32";

describe("loadUserConfig", () => {
  it("checks expected directories for the config", async () => {
    const effects = new MockConfigEffects();
    assert.deepEqual(await loadUserConfig(effects), {
      config: {},
      configPath: isWindows ? "C:\\Users\\Amaya\\.observablehq" : "/home/amaya/.observablehq"
    });
    assert.deepEqual(
      effects._readLog,
      isWindows
        ? [
            "D:\\Projects\\acme-bi\\.observablehq",
            "D:\\Projects\\.observablehq",
            "D:\\.observablehq",
            "C:\\Users\\Amaya\\.observablehq"
          ]
        : [
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

export class MockConfigEffects implements ConfigEffects {
  public env = {};

  public _files: Map<FilePath, string> = new Map();
  public _readLog: FilePath[] = [];
  public _writeLog: FilePath[] = [];

  async readFile(path: FilePath): Promise<string> {
    this._readLog.push(path);
    const content = this._files.get(path);
    if (!content) throw enoentError("File not found in mock");
    return content;
  }

  async writeFile(path: FilePath, contents: string): Promise<void> {
    this._writeLog.push(path);
    this._files.set(path, contents);
  }

  async mkdir(): Promise<void> {
    // do nothing
  }

  homedir() {
    return isWindows ? fileJoin("C:", "Users", "Amaya") : fileJoin("/", "home", "amaya");
  }

  cwd() {
    // it is an important detail that this is not inside the home dir
    return isWindows ? fileJoin("D:", "Projects", "acme-bi") : fileJoin("/", "opt", "projects", "acme-bi");
  }
}

function enoentError(message: string): Error {
  return Object.assign(new Error(message), {code: "ENOENT"});
}
