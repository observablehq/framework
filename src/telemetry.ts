import {exec} from "node:child_process";
import {createHash, randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path/posix";
import os from "os";
import {CliError} from "./error.js";
import type {Logger} from "./logger.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {link, magenta} from "./tty.js";

type uuid = ReturnType<typeof randomUUID>;

type TelemetryIds = {
  session: uuid | null; // random, held in memory for the duration of the process
  device: uuid | null; // persists to ~/.observablehq
  project: string | null; // one-way hash of private salt + repository URL or cwd
};

type TelemetryEnvironment = {
  version: string; // version from package.json
  node: string; // node.js version
  systemPlatform: string; // linux, darwin, win32, ...
  systemRelease: string; // 20.04, 11.2.3, ...
  systemArchitecture: string; // x64, arm64, ...
  cpuCount: number; // number of cpu cores
  cpuModel: string | null; // cpu model name
  cpuSpeed: number | null; // cpu speed in MHz
  memoryInMb: number; // truncated to mb
  isCI: string | boolean; // inside CI heuristic, name or false
  isDocker: boolean; // inside Docker heuristic
  isWSL: boolean; // inside WSL heuristic
};

type TelemetryTime = {
  now: number; // performance.now
  timeOrigin: number; // performance.timeOrigin
  timeZoneOffset: number; // minutes from UTC
};

type TelemetryData = {
  event: "build" | "deploy" | "preview" | "signal" | "login";
  step?: "start" | "finish" | "error";
  [key: string]: unknown;
};

type TelemetryEffects = {
  logger: Logger;
  process: NodeJS.Process;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
};

const defaultEffects: TelemetryEffects = {
  logger: console,
  process,
  readFile,
  writeFile
};

function getOrigin(env: NodeJS.ProcessEnv): URL {
  const urlText = env["OBSERVABLE_TELEMETRY_ORIGIN"];
  if (urlText) {
    try {
      return new URL(urlText);
    } catch (error) {
      throw new CliError(`Invalid OBSERVABLE_TELEMETRY_ORIGIN: ${urlText}`, {cause: error});
    }
  }
  const origin = getObservableUiOrigin(env);
  origin.hostname = "events." + origin.hostname;
  return origin;
}

export class Telemetry {
  private effects: TelemetryEffects;
  private disabled: boolean;
  private debug: boolean;
  private endpoint: URL;
  private timeZoneOffset = new Date().getTimezoneOffset();
  private readonly _pending = new Set<Promise<any>>();
  private _config: Promise<Record<string, uuid>> | undefined;
  private _ids: Promise<TelemetryIds> | undefined;
  private _environment: Promise<TelemetryEnvironment> | undefined;

  static _instance: Telemetry;
  static get instance() {
    return (this._instance ??= new Telemetry());
  }

  static record(data: TelemetryData) {
    return Telemetry.instance.record(data);
  }

  constructor(effects = defaultEffects) {
    this.effects = effects;
    const {process} = effects;
    this.disabled = !!process.env.OBSERVABLE_TELEMETRY_DISABLE;
    this.debug = !!process.env.OBSERVABLE_TELEMETRY_DEBUG;
    this.endpoint = new URL("/cli", getOrigin(process.env));
    process.on("SIGHUP", this.handleSignal(1));
    process.on("SIGINT", this.handleSignal(2));
    process.on("SIGTERM", this.handleSignal(15));
  }

  record(data: TelemetryData) {
    if (this.disabled) return;
    const task = (async () =>
      this.send({
        ids: await this.ids,
        environment: await this.environment,
        time: {now: performance.now(), timeOrigin: performance.timeOrigin, timeZoneOffset: this.timeZoneOffset},
        data
      })
        .catch(() => {})
        .finally(() => {
          this._pending.delete(task);
        }))();
    this._pending.add(task);
  }

  get pending() {
    return Promise.all(this._pending);
  }

  private handleSignal(value: number) {
    const code = 128 + value;
    return async (signal: NodeJS.Signals) => {
      const {process} = this.effects;
      // Give ourselves 1s to record a signal event and flush.
      const deadline = setTimeout(() => process.exit(code), 1000);
      this.record({event: "signal", signal});
      await this.pending;
      clearTimeout(deadline);
      process.exit(code);
    };
  }

  private async getPersistentId(name: string, generator = randomUUID) {
    const {readFile, writeFile} = this.effects;
    const file = join(os.homedir(), ".observablehq");
    if (!this._config) {
      this._config = readFile(file, "utf8")
        .then(JSON.parse)
        .catch(() => ({}));
    }
    const config = await this._config;
    if (!config[name]) {
      config[name] = generator();
      try {
        await writeFile(file, JSON.stringify(config, null, 2));
      } catch {
        // Be ok if we can't persist ids, but treat them as missing.
        return null;
      }
    }
    return config[name];
  }

  private async getProjectId() {
    const salt = await this.getPersistentId("cli_telemetry_salt");
    if (!salt) return null;
    const remote: string | null = await new Promise((resolve) => {
      exec("git config --local --get remote.origin.url", (error, stdout) => resolve(error ? null : stdout.trim()));
    });
    const hash = createHash("sha256");
    hash.update(salt);
    hash.update(remote || this.effects.process.env.REPOSITORY_URL || process.cwd());
    return hash.digest("base64");
  }

  private get ids() {
    return (this._ids ??= Promise.all([this.getPersistentId("cli_telemetry_device"), this.getProjectId()]).then(
      ([device, project]) => ({
        session: randomUUID(),
        device,
        project
      })
    ));
  }

  private get environment() {
    return (this._environment ??= Promise.all([
      import("../package.json"),
      import("ci-info"),
      import("is-docker"),
      import("is-wsl")
    ]).then(([{default: pkg}, ci, {default: isDocker}, {default: isWSL}]) => {
      const cpus = os.cpus() || [];
      return {
        version: pkg.version,
        node: process.versions.node,
        systemPlatform: os.platform(),
        systemRelease: os.release(),
        systemArchitecture: os.arch(),
        cpuCount: cpus.length,
        cpuModel: cpus.length ? cpus[0].model : null,
        cpuSpeed: cpus.length ? cpus[0].speed : null,
        memoryInMb: Math.trunc(os.totalmem() / Math.pow(1024, 2)),
        isCI: ci.name || ci.isCI,
        isDocker: isDocker(),
        isWSL
      };
    }));
  }

  private async showBannerIfNeeded() {
    let called: uuid | undefined;
    await this.getPersistentId("cli_telemetry_banner", () => (called = randomUUID()));
    if (called) {
      this.effects.logger.error(
        `
${magenta("Attention:")} Observable Framework collects anonymous telemetry to help us improve
           the product. See ${link("https://observablehq.com/framework/telemetry")} for details.
           Set \`OBSERVABLE_TELEMETRY_DISABLE=true\` to disable.`
      );
    }
  }

  private async send(data: {
    ids: TelemetryIds;
    environment: TelemetryEnvironment;
    time: TelemetryTime;
    data: TelemetryData;
  }): Promise<void> {
    await this.showBannerIfNeeded();
    if (this.debug) {
      this.effects.logger.error("[telemetry]", data);
      return;
    }
    await fetch(this.endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {"content-type": "application/json"}
    });
  }
}
