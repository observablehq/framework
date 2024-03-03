#!/usr/bin/env node
import {fileURLToPath} from "node:url";
import {sync} from "cross-spawn";

sync(
  "node",
  [
    "--no-warnings=ExperimentalWarning",
    "--import",
    "tsx/esm",
    fileURLToPath(import.meta.resolve("./observable.ts")),
    ...process.argv.slice(2)
  ],
  {stdio: "inherit"}
);
