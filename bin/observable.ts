#!/usr/bin/env tsx

import {type ParseArgsConfig, parseArgs} from "node:util";
import {readConfig} from "../src/config.js";

const command = process.argv.splice(2, 1)[0];

const CONFIG_OPTION = {
  config: {
    type: "string",
    short: "c"
  }
} as const;

switch (command) {
  case "-v":
  case "--version": {
    await import("../package.json").then(({version}: any) => console.log(version));
    break;
  }
  case "build": {
    const {
      values: {config}
    } = helpArgs(command, {
      options: {...CONFIG_OPTION}
    });
    await import("../src/build.js").then(async (build) => build.build({config: await readConfig(config)}));
    break;
  }
  case "deploy": {
    const {
      values: {config}
    } = helpArgs(command, {
      options: {...CONFIG_OPTION}
    });
    await import("../src/deploy.js").then(async (deploy) => deploy.deploy({config: await readConfig(config)}));
    break;
  }
  case "preview": {
    const {
      values: {config, hostname, port}
    } = helpArgs(command, {
      options: {
        ...CONFIG_OPTION,
        hostname: {
          type: "string",
          short: "h",
          default: process.env.HOSTNAME ?? "127.0.0.1"
        },
        port: {
          type: "string",
          short: "p",
          default: process.env.PORT
        }
      }
    });
    await import("../src/preview.js").then(async (preview) =>
      preview.preview({
        config: await readConfig(config),
        hostname: hostname!,
        port: port === undefined ? undefined : +port
      })
    );
    break;
  }
  case "login":
    helpArgs(command, {});
    await import("../src/observableApiAuth.js").then((auth) => auth.login());
    break;
  case "whoami":
    helpArgs(command, {});
    await import("../src/observableApiAuth.js").then((auth) => auth.whoami());
    break;
  case "help":
    usage(0);
    break;
  default:
    usage(1);
    break;
}

function usage(code: number): void {
  (code ? console.error : console.log)(
    `Usage: observable <command> (--help)
   build        generate a static site
   deploy       deploy a project
   preview      run the live preview server
   login        manage authentication with the Observable Cloud
   whoami       check authentication status
   help         this usage information
 --version	print the version`
  );
  process.exit(code);
}

// A wrapper for parseArgs that adds --help functionality with automatic usage.
// TODO It’d be nicer nice if we could change the return type to denote
// arguments with default values, and to enforce required arguments, if any.
function helpArgs<T extends ParseArgsConfig>(command: string, config: T): ReturnType<typeof parseArgs<T>> {
  const result = parseArgs<T>({...config, options: {...config.options, help: {type: "boolean"}}});
  const {help} = result.values as any;
  if (help) {
    console.log(
      `Usage: observable ${command}${Object.entries(config.options ?? {})
        .map(([name, {default: def}]) => ` [--${name}${def === undefined ? "" : `=${def}`}]`)
        .join("")}`
    );
    process.exit(0);
  }
  return result;
}
