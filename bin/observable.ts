#!/usr/bin/env tsx

import {normalize} from "node:path";
import {type ParseArgsConfig, parseArgs} from "node:util";

const command = process.argv.splice(2, 1)[0];

const ROOT_OPTION = {
  root: {
    type: "string",
    short: "r",
    default: "docs"
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
      values: {root, output}
    } = helpArgs(command, {
      options: {
        ...ROOT_OPTION,
        output: {
          type: "string",
          short: "o",
          default: "dist"
        }
      }
    });
    await import("../src/build.js").then((build) =>
      build.build({
        sourceRoot: normalize(root!).replace(/\/$/, ""),
        outputRoot: normalize(output!).replace(/\/$/, "")
      })
    );
    break;
  }
  case "deploy": {
    const {
      values: {root}
    } = helpArgs(command, {
      options: {...ROOT_OPTION}
    });
    const sourceRoot = normalize(root!).replace(/\/$/, "");
    await import("../src/deploy.js").then((deploy) => deploy.deploy({sourceRoot}));
    break;
  }
  case "preview": {
    const {
      values: {root, hostname, port}
    } = helpArgs(command, {
      options: {
        root: {
          type: "string",
          short: "r",
          default: "docs"
        },
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
    await import("../src/preview.js").then((preview) =>
      preview.preview({
        root: normalize(root!).replace(/\/$/, ""),
        hostname: hostname!,
        port: port === undefined ? undefined : +port
      })
    );
    break;
  }
  case "login":
    await import("../src/observableApiAuth.js").then((auth) => auth.login());
    break;
  case "whoami":
    await import("../src/observableApiAuth.js").then((auth) => auth.whoami());
    break;
  default:
    console.error("Usage: observable <command>");
    console.error("   build\tgenerate a static site");
    console.error("   deploy\tdeploy a project");
    console.error("   preview\trun the live preview server");
    console.error("   login\tmanage authentication with the Observable Cloud");
    console.error("   whoami\tcheck authentication status");
    console.error(" --version\tprint the version");
    process.exit(1);
    break;
}

// A wrapper for parseArgs that adds --help functionality with automatic usage.
// TODO It’d be nicer nice if we could change the return type to denote
// arguments with default values, and to enforce required arguments, if any.
function helpArgs<T extends ParseArgsConfig>(command: string, config: T): ReturnType<typeof parseArgs<T>> {
  const result = parseArgs<T>({...config, options: {...config.options, help: {type: "boolean"}}});
  const {help} = result.values as any;
  if (help) {
    console.error(
      `Usage: observable ${command}${Object.entries(config.options ?? {})
        .map(([name, {default: def}]) => ` [--${name}${def === undefined ? "" : `=${def}`}]`)
        .join("")}`
    );
    process.exit(1);
  }
  return result;
}
