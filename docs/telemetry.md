# Telemetry

The Observable CLI collects anonymous usage data to help us improve the product. This data is sent to Observable and is not shared with third parties.

You can opt out of telemetry by setting the `OBSERVABLE_TELEMETRY_DISABLE` environment variable to `true`.

## What data is collected?

No personal identifying information (such as your observablehq.com user name) is ever collected. For reference, the following data is sent:

```typescript
type TelemetryIds = {
  session: uuid; // random, held in memory for the duration of the process
  device: uuid; // persists to ~/.observablehq
  project: string; // one-way hash of private salt + repository URL or cwd
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
```

If you wish to inspect this data, you can set the `OBSERVABLE_TELEMETRY_DEBUG` environment variable to `true`. This will print the telemetry data to stderr instead of sending it to Observable.

## Disabling data collection

Setting either of the environment variables below to `true` will disable telemetry.

`OBSERVABLE_TELEMETRY_DISABLE=true` disables telemetry collection entirely.

`OBSERVABLE_TELEMETRY_DEBUG=true` prints telemetry data to stderr instead of sending it to Observable.
