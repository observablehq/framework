import {type ParseArgsConfig, parseArgs} from "node:util";
import * as clack from "@clack/prompts";
import {readConfig} from "../src/config.js";
import {CliError} from "../src/error.js";
import {enableNpmVersionResolution, enableRemoteModulePreload} from "../src/javascript/imports.js";
import {red} from "../src/tty.js";

const args = process.argv.slice(2);

const CONFIG_OPTION = {
  root: {
    type: "string"
  },
  config: {
    type: "string",
    short: "c"
  }
} as const;

// Convert --version or -v as first argument into version.
if (args[0] === "--version" || args[0] === "-v") args[0] = "version";

// Parse the initial options loosely.
const {values, positionals, tokens} = parseArgs({
  options: {
    help: {
      type: "boolean",
      short: "h"
    }
  },
  strict: false,
  tokens: true,
  args
});

let command: string | undefined;

// Extract the command.
if (positionals.length > 0) {
  const t = tokens.find((t) => t.kind === "positional")!;
  args.splice(t.index, 1);
  command = positionals[0];

  // Convert help <command> into <command> --help.
  if (command === "help" && positionals.length > 1) {
    const p = tokens.find((p) => p.kind === "positional" && p !== t)!;
    args.splice(p.index, 1, "--help");
    command = positionals[1];
  }
}

// Convert --help or -h (with no command) into help.
else if (values.help) {
  const t = tokens.find((t) => t.kind === "option" && t.name === "help")!;
  args.splice(t.index, 1);
  command = "help";
}

/** Commands that use Clack formatting. When handling CliErrors, clack.outro()
 * will be used for these commands. */
const CLACKIFIED_COMMANDS = ["create", "deploy", "login"];

try {
  switch (command) {
    case undefined:
    case "help": {
      helpArgs(command, {allowPositionals: true});
      console.log(
        `usage: observable <command>
  create       create a new project from a template
  preview      start the preview server
  build        generate a static site
  login        sign-in to Observable
  logout       sign-out of Observable
  deploy       deploy a project to Observable
  whoami       check authentication status
  convert      convert an Observable notebook to Markdown
  help         print usage information
  version      print the version`
      );
      if (command === undefined) process.exit(1);
      break;
    }
    case "version": {
      helpArgs(command, {});
      await import("../package.json").then(({version}: any) => console.log(version));
      break;
    }
    case "build": {
      const {
        values: {config, root}
      } = helpArgs(command, {
        options: {...CONFIG_OPTION}
      });
      await import("../src/build.js").then(async (build) => build.build({config: await readConfig(config, root)}));
      break;
    }
    case "create": {
      helpArgs(command, {});
      await import("../src/create.js").then(async (create) => create.create());
      break;
    }
    case "deploy": {
      const {
        values: {config, root, message}
      } = helpArgs(command, {
        options: {
          ...CONFIG_OPTION,
          message: {
            type: "string",
            short: "m"
          }
        }
      });
      await import("../src/deploy.js").then(async (deploy) =>
        deploy.deploy({config: await readConfig(config, root), message})
      );
      break;
    }
    case "preview": {
      const {
        values: {config, root, host, port}
      } = helpArgs(command, {
        options: {
          ...CONFIG_OPTION,
          host: {
            type: "string",
            default: process.env.HOSTNAME ?? "127.0.0.1"
          },
          port: {
            type: "string",
            default: process.env.PORT
          }
        }
      });
      enableNpmVersionResolution(false);
      enableRemoteModulePreload(false);
      await import("../src/preview.js").then(async (preview) =>
        preview.preview({
          config: await readConfig(config, root),
          hostname: host!,
          port: port === undefined ? undefined : +port
        })
      );
      break;
    }
    case "login": {
      helpArgs(command, {});
      await import("../src/observableApiAuth.js").then((auth) => auth.login());
      break;
    }
    case "logout": {
      helpArgs(command, {});
      await import("../src/observableApiAuth.js").then((auth) => auth.logout());
      break;
    }
    case "whoami": {
      helpArgs(command, {});
      await import("../src/observableApiAuth.js").then((auth) => auth.whoami());
      break;
    }
    case "convert": {
      const {
        positionals,
        values: {output}
      } = helpArgs(command, {
        options: {output: {type: "string", default: "."}},
        allowPositionals: true
      });
      await import("../src/convert.js").then((convert) => convert.convert(positionals, String(output)));
      break;
    }
    default: {
      console.error(`observable: unknown command '${command}'. See 'observable help'.`);
      process.exit(1);
      break;
    }
  }
} catch (error) {
  if (error instanceof CliError) {
    if (error.print) {
      if (command && CLACKIFIED_COMMANDS.includes(command)) {
        clack.outro(red(`Error: ${error.message}`));
      } else {
        console.error(red(error.message));
      }
    }
    process.exit(error.exitCode);
  }
  throw error;
}

// A wrapper for parseArgs that adds --help functionality with automatic usage.
// TODO It’d be nicer nice if we could change the return type to denote
// arguments with default values, and to enforce required arguments, if any.
function helpArgs<T extends ParseArgsConfig>(command: string | undefined, config: T): ReturnType<typeof parseArgs<T>> {
  let result: ReturnType<typeof parseArgs<T>>;
  try {
    result = parseArgs<T>({...config, options: {...config.options, help: {type: "boolean", short: "h"}}, args});
  } catch (error: any) {
    if (!error.code?.startsWith("ERR_PARSE_ARGS_")) throw error;
    console.error(`observable: ${error.message}. See 'observable help${command ? ` ${command}` : ""}'.`);
    process.exit(1);
  }
  if ((result.values as any).help) {
    console.log(
      `Usage: observable ${command}${command === undefined || command === "help" ? " <command>" : ""}${Object.entries(
        config.options ?? {}
      )
        .map(([name, {default: def}]) => ` [--${name}${def === undefined ? "" : `=${def}`}]`)
        .join("")}`
    );
    process.exit(0);
  }
  return result;
}
