import type {UUID} from "node:crypto";

export type TelemetryIds = {
  session: UUID | null; // random, held in memory for the duration of the process
  device: UUID | null; // persists to ~/.observablehq
  project: string | null; // one-way hash of private salt + repository URL or cwd
};

export type TelemetryEnvironment = {
  version: string; // version from package.json
  userAgent: string; // npm_config_user_agent
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

export type TelemetryTime = {
  now: number; // performance.now
  timeOrigin: number; // performance.timeOrigin
  timeZoneOffset: number; // minutes from UTC
};

export type TelemetryData =
  | {event: "build"; step: "start"}
  | {event: "build"; step: "finish"; pageCount: number}
  | {event: "deploy"; step: "start"; force: boolean | null | "build" | "deploy"}
  | {event: "deploy"; step: "finish"}
  | {event: "deploy"; step: "error"}
  | {event: "deploy"; buildManifest: "found" | "missing" | "error"}
  | {event: "preview"; step: "start"}
  | {event: "preview"; step: "finish"}
  | {event: "preview"; step: "error"}
  | {event: "signal"; signal: NodeJS.Signals}
  | {event: "login"; step: "start"}
  | {event: "login"; step: "finish"}
  | {event: "login"; step: "error"; code: "expired" | "consumed" | "no-key" | `unknown-${string}`};
