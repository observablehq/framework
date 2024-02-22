#!/usr/bin/env node
import {fileURLToPath} from "node:url";
import crossSpawn from "cross-spawn";

const observablePath = fileURLToPath(import.meta.resolve("./observable.ts"));
crossSpawn.sync(
  "node",
  ["--no-warnings=ExperimentalWarning", "--import", "tsx/esm", observablePath, ...process.argv.slice(2)],
  {stdio: "inherit"}
);
