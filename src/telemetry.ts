import {exec} from "node:child_process";
import {createHash, randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import os from "os";
import {CliError} from "./error.js";
import type {Logger} from "./logger.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {cyan, magenta} from "./tty.js";

type uuid = ReturnType<typeof randomUUID>;
type TelemetryIds = {
  session: uuid | null; // random, held in memory for the duration of the process
  device: uuid | null; // persists to ~/.observablehq
  project: string | null; // one-way hash of private salt + repository URL or cwd
};
type TelemetryEnvironment = {
  version: string; // cli version from package.json
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
  event: "build" | "deploy" | "preview";
  step: "start" | "finish";
  [key: string]: unknown;
};

let _config: Promise<Record<string, uuid>> | undefined;
async function getPersistentId(name: string, generator = randomUUID) {
  const file = join(os.homedir(), ".observablehq");
  if (!_config) {
    _config = readFile(file, "utf8")
      .then(JSON.parse)
      .catch(() => ({}));
  }
  const config = await _config;
  if (!config[name]) {
    config[name] = generator();
    try {
      await writeFile(file, JSON.stringify(config, null, 2));
    } catch (error) {
      // Be ok if we can't persist ids, but treat them as missing.
      return null;
    }
  }
  return config[name];
}

type TelemetryEffects = {
  env: NodeJS.ProcessEnv;
  logger: Logger;
  getPersistentId: typeof getPersistentId;
};
const defaultEffects: TelemetryEffects = {
  env: process.env,
  logger: console,
  getPersistentId
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
  private disabled: boolean;
  private debug: boolean;
  private endpoint: URL;
  private logger: Logger;
  private getPersistentId: typeof getPersistentId;
  private timeZoneOffset = new Date().getTimezoneOffset();
  private readonly pending = new Set<Promise<any>>();
  private _ids: Promise<TelemetryIds> | undefined;
  private _environment: Promise<TelemetryEnvironment> | undefined;

  private static instance = new Telemetry();
  static init(effects = defaultEffects) {
    Telemetry.instance = new Telemetry(effects);
  }
  static record(data: TelemetryData) {
    return Telemetry.instance.record(data);
  }
  static flush() {
    return Telemetry.instance.flush();
  }

  constructor(effects = defaultEffects) {
    this.disabled = !!effects.env.OBSERVABLE_TELEMETRY_DISABLE;
    this.debug = !!effects.env.OBSERVABLE_TELEMETRY_DEBUG;
    this.endpoint = new URL("/cli", getOrigin(effects.env));
    this.logger = effects.logger;
    this.getPersistentId = effects.getPersistentId;
  }

  async record(data: TelemetryData) {
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
          this.pending.delete(task);
        }))();
    this.pending.add(task);
  }

  flush() {
    return Promise.all(this.pending);
  }

  private async getProjectId() {
    const salt = await this.getPersistentId("cli_telemetry_salt");
    if (!salt) return null;
    const remote: string | null = await new Promise((resolve) => {
      exec("git config --local --get remote.origin.url", (error, stdout) => resolve(error ? null : stdout.trim()));
    });
    const hash = createHash("sha256");
    hash.update(salt);
    hash.update(remote || process.env.REPOSITORY_URL || process.cwd());
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

  private async needsBanner() {
    let called: uuid | undefined;
    await this.getPersistentId("cli_telemetry_banner", () => (called = randomUUID()));
    return !!called;
  }

  private async send(data: {
    ids: TelemetryIds;
    environment: TelemetryEnvironment;
    time: TelemetryTime;
    data: TelemetryData;
  }): Promise<void> {
    if (await this.needsBanner()) {
      this.logger.error(
        `${magenta(
          "Attention"
        )}: Observable CLI collects anonymous telemetry data to help us improve the product.\nSee ${cyan(
          "https://cli.observablehq.com/telemetry"
        )} for details and how to opt-out.`
      );
    }
    if (this.debug) {
      this.logger.error("[telemetry]", data);
      return;
    }
    await fetch(this.endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {"content-type": "application/json"}
    });
  }
}
