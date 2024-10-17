import {exec} from "node:child_process";
import type {UUID} from "node:crypto";
import {createHash, randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import os from "node:os";
import {join} from "node:path/posix";
import {CliError} from "./error.js";
import type {Logger} from "./logger.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import type {TelemetryData, TelemetryEnvironment, TelemetryIds, TelemetryTime} from "./telemetryData.js";
import {link, magenta} from "./tty.js";

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
  private readonly _pending = new Set<Promise<unknown>>();
  private _config: Promise<Record<string, UUID>> | undefined;
  private _ids: Promise<TelemetryIds> | undefined;
  private _environment: Promise<TelemetryEnvironment> | undefined;

  static _instance: Telemetry;
  static get instance(): Telemetry {
    return (this._instance ??= new Telemetry());
  }

  static record(data: TelemetryData): void {
    return Telemetry.instance.record(data);
  }

  constructor(effects = defaultEffects) {
    this.effects = effects;
    const {process} = effects;
    this.disabled = !!process.env.OBSERVABLE_TELEMETRY_DISABLE;
    this.debug = !!process.env.OBSERVABLE_TELEMETRY_DEBUG;
    this.endpoint = new URL("/cli", getOrigin(process.env));
    this.handleSignal("SIGHUP");
    this.handleSignal("SIGINT");
    this.handleSignal("SIGTERM");
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

  private handleSignal(name: string): void {
    const {process} = this.effects;
    let exiting = false;
    const signaled = async (signal: NodeJS.Signals) => {
      if (exiting) return; // already exiting
      exiting = true;
      this.record({event: "signal", signal});
      try {
        // Allow one second to record a signal event and flush.
        await Promise.race([this.pending, new Promise((resolve) => setTimeout(resolve, 1000))]);
      } catch {
        // ignore error
      }
      process.off(name, signaled); // don’t handle our own kill
      process.kill(process.pid, signal);
    };
    process.on(name, signaled);
  }

  private async getPersistentId(name: string, generator = randomUUID): Promise<UUID | null> {
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

  private async getProjectId(): Promise<string | null> {
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

  private get ids(): Promise<TelemetryIds> {
    return (this._ids ??= Promise.all([this.getPersistentId("cli_telemetry_device"), this.getProjectId()]).then(
      ([device, project]) => {
        const ids: TelemetryIds = {
          session: randomUUID(),
          device,
          project
        };
        return ids;
      }
    ));
  }

  private get environment(): Promise<TelemetryEnvironment> {
    return (this._environment ??= Promise.all([import("ci-info"), import("is-docker"), import("is-wsl")]).then(
      ([ci, {default: isDocker}, {default: isWSL}]) => {
        const cpus = os.cpus() || [];
        const environment: TelemetryEnvironment = {
          version: process.env.npm_package_version!,
          userAgent: process.env.npm_config_user_agent!,
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
        return environment;
      }
    ));
  }

  private async showBannerIfNeeded() {
    let called: UUID | undefined;
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
