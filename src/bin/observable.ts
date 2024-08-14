#!/usr/bin/env node
import {join} from "node:path/posix";
import type {ParseArgsConfig} from "node:util";
import {parseArgs} from "node:util";
import * as clack from "@clack/prompts";
import wrapAnsi from "wrap-ansi";
import {readConfig} from "../config.js";
import {CliError} from "../error.js";
import {faint, link, red} from "../tty.js";

const args = process.argv.slice(2);

const CONFIG_OPTION = {
  root: {
    type: "string",
    description: "Path to the project root"
  },
  config: {
    type: "string",
    short: "c",
    description: "Path to the project config file"
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
    },
    debug: {
      type: "boolean",
      short: "d"
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
    args.splice(p.index - 1, 1, "--help");
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
const CLACKIFIED_COMMANDS = ["create", "deploy", "login", "convert"];

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
      console.log(process.env.npm_package_version);
      break;
    }
    case "build": {
      const {
        values: {config, root}
      } = helpArgs(command, {
        options: {...CONFIG_OPTION}
      });
      await import("../build.js").then(async (build) => build.build({config: await readConfig(config, root)}));
      break;
    }
    case "create": {
      helpArgs(command, {});
      await import("../create.js").then(async (create) => create.create());
      break;
    }
    case "deploy": {
      const {
        values: {config, root, message, build, id, "deploy-config": deployConfigPath}
      } = helpArgs(command, {
        options: {
          ...CONFIG_OPTION,
          message: {
            type: "string",
            short: "m",
            description: "Message to associate with this deploy"
          },
          build: {
            type: "boolean",
            description: "Always build before deploying"
          },
          "no-build": {
            type: "boolean",
            description: "Don’t build before deploying; deploy as is"
          },
          id: {
            type: "string",
            hidden: true
          },
          "deploy-config": {
            type: "string",
            description: "Path to the deploy config file (deploy.json)"
          }
        }
      });
      await import("../deploy.js").then(async (deploy) =>
        deploy.deploy({
          config: await readConfig(config, root),
          message,
          force: build === true ? "build" : build === false ? "deploy" : null,
          deployId: id,
          deployConfigPath
        })
      );
      break;
    }
    case "preview": {
      const {values} = helpArgs(command, {
        options: {
          ...CONFIG_OPTION,
          host: {
            type: "string",
            default: "127.0.0.1"
          },
          port: {
            type: "string"
          },
          open: {
            type: "boolean",
            default: true
          },
          "no-open": {
            type: "boolean"
          }
        }
      });
      const {config, root, host, port, open} = values;
      await readConfig(config, root); // Ensure the config is valid.
      await import("../preview.js").then(async (preview) =>
        preview.preview({
          config,
          root,
          hostname: host!,
          port: port === undefined ? undefined : +port,
          open
        })
      );
      break;
    }
    case "login": {
      helpArgs(command, {});
      await import("../observableApiAuth.js").then((auth) => auth.login());
      break;
    }
    case "logout": {
      helpArgs(command, {});
      await import("../observableApiAuth.js").then((auth) => auth.logout());
      break;
    }
    case "whoami": {
      helpArgs(command, {});
      await import("../observableApiAuth.js").then((auth) => auth.whoami());
      break;
    }
    case "convert": {
      const {
        positionals,
        values: {config, root, output: out, force}
      } = helpArgs(command, {
        options: {
          output: {
            type: "string",
            description: "Output directory (defaults to the source root)"
          },
          force: {
            type: "boolean",
            short: "f",
            description: "If true, overwrite existing resources"
          },
          ...CONFIG_OPTION
        },
        allowPositionals: true
      });
      // The --output command-line option is relative to the cwd, but the root
      // config option (typically "src") is relative to the project root.
      const output = out ?? join(root ?? ".", (await readConfig(config, root)).root);
      await import("../convert.js").then((convert) => convert.convert(positionals, {output, force}));
      break;
    }
    default: {
      console.error(`observable: unknown command '${command}'. See 'observable help'.`);
      process.exit(1);
      break;
    }
  }
} catch (error: any) {
  const wrapWidth = Math.min(80, process.stdout.columns ?? 80);
  const bugMessage = "If you think this is a bug, please file an issue at";
  const bugUrl = "https://github.com/observablehq/framework/issues";
  const clackBugMessage = () => {
    // clack.outro doesn't handle multiple lines well, so do it manually
    console.log(`${faint("│\n│")}  ${bugMessage}\n${faint("└")}  ${link(bugUrl)}\n`);
  };
  const consoleBugMessage = () => {
    console.error(`${bugMessage}\n↳ ${link(bugUrl)}\n`);
  };

  if (error instanceof CliError) {
    if (error.print) {
      if (command && CLACKIFIED_COMMANDS.includes(command)) {
        clack.log.error(wrapAnsi(red(`Error: ${error.message}`), wrapWidth));
        clackBugMessage();
      } else {
        console.error(red(error.message));
        consoleBugMessage();
      }
    }
    process.exit(error.exitCode);
  } else {
    if (command && CLACKIFIED_COMMANDS.includes(command)) {
      clack.log.error(wrapAnsi(`${red("Error:")} ${error.message}`, wrapWidth));
      if (values.debug) {
        clack.outro("The full error follows");
        throw error;
      } else {
        clack.log.info("To see the full stack trace, run with the --debug flag.");
        clackBugMessage();
      }
    } else {
      console.error(`\n${red("Unexpected error:")} ${error.message}`);
      if (values.debug) {
        console.error("The full error follows\n");
        throw error;
      } else {
        console.error("\nTip: To see the full stack trace, run with the --debug flag.\n");
        consoleBugMessage();
      }
    }
  }
  process.exit(1);
}

type DescribableParseArgsConfig = ParseArgsConfig & {
  options?: {
    [longOption: string]: {
      type: "string" | "boolean";
      multiple?: boolean | undefined;
      short?: string | undefined;
      default?: string | boolean | string[] | boolean[] | undefined;
      description?: string;
      hidden?: boolean;
    };
  };
};

// A wrapper for parseArgs that adds --help functionality with automatic usage.
// TODO It’d be nicer nice if we could change the return type to denote
// arguments with default values, and to enforce required arguments, if any.
function helpArgs<T extends DescribableParseArgsConfig>(
  command: string | undefined,
  config: T
): ReturnType<typeof parseArgs<T>> {
  const {options = {}} = config;

  // Find the boolean --foo options that have a corresponding boolean --no-foo.
  const booleanPairs: string[] = [];
  for (const key in options) {
    if (options[key].type === "boolean" && !key.startsWith("no-") && options[`no-${key}`]?.type === "boolean") {
      booleanPairs.push(key);
    }
  }

  let result: ReturnType<typeof parseArgs<T>>;
  try {
    result = parseArgs<T>({
      ...config,
      tokens: config.tokens || booleanPairs.length > 0,
      options: {...options, help: {type: "boolean", short: "h"}, debug: {type: "boolean"}},
      args
    });
  } catch (error: any) {
    if (!error.code?.startsWith("ERR_PARSE_ARGS_")) throw error;
    console.error(`observable: ${error.message}. See 'observable help${command ? ` ${command}` : ""}'.`);
    process.exit(1);
  }

  // Log automatic help.
  if ((result.values as any).help) {
    // Omit hidden flags from help.
    const publicOptions = Object.fromEntries(Object.entries(options).filter(([, option]) => !option.hidden));
    console.log(
      `Usage: observable ${command}${command === undefined || command === "help" ? " <command>" : ""}${Object.entries(
        publicOptions
      )
        .map(([name, {default: def}]) => ` [--${name}${def === undefined ? "" : `=${def}`}]`)
        .join("")}`
    );
    if (Object.values(publicOptions).some((spec) => spec.description)) {
      console.log();
      for (const [long, spec] of Object.entries(publicOptions)) {
        if (spec.description) {
          const left = `  ${spec.short ? `-${spec.short}, ` : ""}--${long}`.padEnd(20);
          console.log(`${left}${spec.description}`);
        }
      }
      console.log();
    }
    process.exit(0);
  }

  // Merge --no-foo into --foo based on order
  // https://nodejs.org/api/util.html#parseargs-tokens
  if ("tokens" in result && result.tokens) {
    const {values, tokens} = result;
    for (const key of booleanPairs) {
      for (const token of tokens) {
        if (token.kind !== "option") continue;
        const {name} = token;
        if (name === `no-${key}`) values[key] = false;
        else if (name === key) values[key] = true;
      }
    }
  }

  return result;
}
