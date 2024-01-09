import {exec} from "node:child_process";
import {createHash, randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import os from "os";

type uuid = ReturnType<typeof randomUUID>;
type TelemetryIds = {
  device: uuid;
  project: string;
  session: uuid;
};
type TelemetryEnvironment = {
  version: string;
  systemPlatform: string;
  systemRelease: string;
  systemArchitecture: string;
  cpuCount: number;
  cpuModel: string | null;
  cpuSpeed: number | null;
  memoryInMb: number;
};
type TelemetryData = {
  event: "build" | "deploy" | "preview";
  step: "start" | "finish";
};

export class Telemetry {
  private disabled = !!process.env.OBSERVABLE_TELEMETRY_DISABLE;
  private debug = !!process.env.OBSERVABLE_TELEMETRY_DEBUG;
  private origin = process.env.OBSERVABLE_TELEMETRY_ORIGIN || "https://events.observablehq.com";
  private readonly pending = new Set<Promise<any>>();
  private _config: Record<string, uuid> | undefined;
  private _ids: Promise<TelemetryIds> | undefined;
  private _environment: Promise<TelemetryEnvironment> | undefined;

  async record(data: TelemetryData) {
    if (this.disabled) return;
    const task = this.send({
      ids: await this.ids,
      environment: await this.environment,
      now: performance.now(),
      data
    })
      .catch(() => {})
      .finally(() => {
        this.pending.delete(task);
      });
    this.pending.add(task);
  }

  flush() {
    return Promise.all(this.pending);
  }

  private async getPersistentId(name: string): Promise<uuid> {
    const file = join(os.homedir(), ".observablehq");
    if (!this._config) {
      try {
        this._config = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        // fall through
      }
      this._config ??= {};
    }
    if (!this._config[name]) {
      this._config[name] = randomUUID();
      await writeFile(file, JSON.stringify(this._config, null, 2));
    }
    return this._config[name];
  }

  private async getProjectId() {
    const remote: string | null = await new Promise((resolve) => {
      exec("git config --local --get remote.origin.url", (error, stdout) => resolve(error ? null : stdout.trim()));
    });
    const hash = createHash("sha256");
    hash.update(await this.getPersistentId("cli_telemetry_salt"));
    hash.update(remote || process.env.REPOSITORY_URL || process.cwd());
    return hash.digest("base64");
  }

  private get ids() {
    return (this._ids ??= Promise.all([this.getPersistentId("cli_telemetry_device"), this.getProjectId()]).then(
      ([device, project]) => ({
        device,
        project,
        session: randomUUID()
      })
    ));
  }

  private get environment() {
    return (this._environment ??= Promise.all([import("../package.json"), import("ci-info"), import("is-docker")]).then(
      ([{default: pkg}, ci, {default: isDocker}]) => {
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
          ci: ci.name || ci.isCI,
          docker: isDocker()
        };
      }
    ));
  }

  private async send(data: {
    ids: TelemetryIds;
    environment: TelemetryEnvironment;
    now: number;
    data: TelemetryData;
  }): Promise<void> {
    // todo banner
    if (this.debug) {
      console.error("[telemetry]", data);
      return;
    }
    await fetch(`${this.origin}/cli`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {"content-type": "application/json"}
    });
  }
}
