import {randomUUID} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import os from "os";

type TelemetryIds = {
  deviceId: string;
  projectId: string;
  sessionId: ReturnType<typeof randomUUID>;
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
  private debug: boolean;
  private root: string;
  private readonly pending = new Set<Promise<any>>();
  private _config: Record<string, string> | undefined;
  private _ids: Promise<TelemetryIds> | undefined;
  private _environment: Promise<TelemetryEnvironment> | undefined;

  constructor(root: string) {
    this.debug = !!process.env.OBSERVABLE_TELEMETRY_DEBUG;
    this.root = root;
  }

  async record(data: TelemetryData) {
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

  private async getPersistentId(name: string): Promise<string> {
    const file = join(process.cwd(), this.root, ".observablehq", "telemetry.json");
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
      await writeFile(file, JSON.stringify(this._config));
    }
    return this._config[name];
  }

  private get ids() {
    return (this._ids ??= this.getPersistentId("device").then((deviceId) => ({
      deviceId,
      projectId: randomUUID(), // todo: hash git url or cwd name + salt
      sessionId: randomUUID()
    })));
  }

  private get environment() {
    return (this._environment ??= import("../package.json").then(({version}: any) => {
      const cpus = os.cpus() || [];
      return {
        version,
        systemPlatform: os.platform(),
        systemRelease: os.release(),
        systemArchitecture: os.arch(),
        cpuCount: cpus.length,
        cpuModel: cpus.length ? cpus[0].model : null,
        cpuSpeed: cpus.length ? cpus[0].speed : null,
        memoryInMb: Math.trunc(os.totalmem() / Math.pow(1024, 2))
        // todo: ci
        // todo: docker
      };
    }));
  }

  private async send(data: {
    ids: TelemetryIds;
    environment: TelemetryEnvironment;
    now: number;
    data: TelemetryData;
  }): Promise<void> {
    if (this.debug) {
      console.log("[telemetry]", data);
      return;
    }
    await fetch("https://telemetry.observablehq.com/cli", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {"content-type": "application/json"}
    });
  }
}
