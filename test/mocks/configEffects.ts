import {join} from "node:path/posix";
import type {ConfigEffects} from "../../src/observableApiConfig.js";

export class MockConfigEffects implements ConfigEffects {
  public env = {};

  public _files: Map<string, string> = new Map();
  public _readLog: string[] = [];
  public _writeLog: string[] = [];

  async readFile(path: string): Promise<string> {
    this._readLog.push(path);
    const content = this._files.get(path);
    if (!content) throw enoentError("File not found in mock");
    return content;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this._writeLog.push(path);
    this._files.set(path, contents);
  }

  async mkdir(): Promise<void> {
    // do nothing
  }

  homedir() {
    return join("/", "home", "amaya");
  }

  cwd() {
    return join("/", "opt", "projects", "acme-bi");
  }
}

function enoentError(message: string): Error {
  return Object.assign(new Error(message), {code: "ENOENT"});
}
