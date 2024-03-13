# Telemetry

Observable Framework collects anonymous usage data to help us improve the product. This data is sent to Observable and is not shared with third parties. Telemetry data is covered by [Observable’s privacy policy](https://observablehq.com/privacy-policy).

You can [opt-out of telemetry](#disabling-telemetry) by setting the `OBSERVABLE_TELEMETRY_DISABLE` environment variable to `true`.

## What is collected?

The following data is collected:

```ts
type TelemetryIds = {
  session: uuid; // random, held in memory for the duration of the process
  device: uuid; // persists to ~/.observablehq
  project: string; // one-way hash of private salt + repository URL or cwd
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
  event: "build" | "deploy" | "preview" | "signal";
  step?: "start" | "finish";
  [key: string]: unknown;
};
```

To inspect telemetry data, set the `OBSERVABLE_TELEMETRY_DEBUG` environment variable to `true`. This will print the telemetry data to stderr instead of sending it to Observable. See [`telemetry.ts`](https://github.com/observablehq/framework/blob/main/src/telemetry.ts) for source code.

## What is not collected?

We never collect identifying or sensitive information, such as environment variables, file names or paths, or file contents.

## Disabling telemetry

Setting the `OBSERVABLE_TELEMETRY_DISABLE` environment variable to `true` disables telemetry collection entirely. For example:

```sh
OBSERVABLE_TELEMETRY_DISABLE=true npm run build
```

Setting the `OBSERVABLE_TELEMETRY_DEBUG` environment variable to `true` also disables telemetry collection, instead printing telemetry data to stderr. Use this to inspect what telemetry data would be collected.
