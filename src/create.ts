import {exec} from "node:child_process";
import {accessSync, existsSync, readdirSync, statSync} from "node:fs";
import {constants, copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import op from "node:path";
import {basename, dirname, join, normalize} from "node:path/posix";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import * as clack from "@clack/prompts";
import untildify from "untildify";
import wrapAnsi from "wrap-ansi";
import type {ClackEffects} from "./clack.js";
import type {TtyEffects} from "./tty.js";
import {cyan, defaultEffects as defaultTtyEffects, faint, inverse, link, reset} from "./tty.js";

export interface CreateEffects extends TtyEffects {
  clack: ClackEffects;
  sleep: (delay?: number) => Promise<void>;
  mkdir(outputPath: string, options?: {recursive?: boolean}): Promise<void>;
  copyFile(sourcePath: string, outputPath: string): Promise<void>;
  writeFile(outputPath: string, contents: string): Promise<void>;
}

const defaultEffects: CreateEffects = {
  ...defaultTtyEffects,
  clack,
  sleep,
  async mkdir(outputPath: string, options): Promise<void> {
    await mkdir(outputPath, options);
  },
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    await copyFile(sourcePath, outputPath);
  },
  async writeFile(outputPath: string, contents: string): Promise<void> {
    await writeFile(outputPath, contents);
  }
};

export async function create(effects: CreateEffects = defaultEffects): Promise<void> {
  const {clack} = effects;
  clack.intro(`${inverse(" observable create ")} ${faint(`v${process.env.npm_package_version}`)}`);
  const defaultRootPath = `.${op.sep}hello-framework`;
  const defaultRootPathError = validateRootPath(defaultRootPath);
  clack.log.success(
    wrapAnsi(
      "Welcome to Observable Framework! 👋 This command will help you create a new project. When prompted, you can press Enter to accept the default value.",
      Math.min(80, effects.outputColumns)
    ) + `\n\nWant help? ${link("https://observablehq.com/framework/getting-started")}`
  );
  await clack.group(
    {
      rootPath: () =>
        clack.text({
          message: "Where should we create your project?",
          placeholder: defaultRootPath,
          defaultValue: defaultRootPathError ? undefined : defaultRootPath,
          validate: (input) => validateRootPath(input, defaultRootPathError)
        }),
      projectTitle: ({results: {rootPath}}) =>
        clack.text({
          message: "What should we title your project?",
          placeholder: inferTitle(rootPath!),
          defaultValue: inferTitle(rootPath!)
        }),
      includeSampleFiles: () =>
        clack.select({
          message: "Include sample files to help you get started?",
          options: [
            {value: true, label: "Yes, include sample files", hint: "recommended"},
            {value: false, label: "No, create an empty project"}
          ],
          initialValue: true
        }),
      packageManager: () =>
        clack.select({
          message: "Install dependencies?",
          options: [
            {value: "npm", label: "Yes, via npm", hint: "recommended"},
            {value: "yarn", label: "Yes, via yarn", hint: "recommended"},
            {value: null, label: "No"}
          ],
          initialValue: inferPackageManager("npm")
        }),
      initializeGit: () =>
        clack.confirm({
          message: "Initialize git repository?"
        }),
      installing: async ({results: {rootPath, projectTitle, includeSampleFiles, packageManager, initializeGit}}) => {
        rootPath = untildify(rootPath!);
        let spinning = true;
        const s = clack.spinner();
        s.start("Copying template files");
        const template = includeSampleFiles ? "default" : "empty";
        const templateDir = op.resolve(fileURLToPath(import.meta.url), "..", "..", "templates", template);
        const runCommand = packageManager === "yarn" ? "yarn" : `${packageManager ?? "npm"} run`;
        const installCommand = `${packageManager ?? "npm"} install`;
        await effects.sleep(1000); // this step is fast; give the spinner a chance to show
        await recursiveCopyTemplate(
          templateDir,
          rootPath!,
          {
            runCommand,
            installCommand,
            rootPath: rootPath!,
            projectTitle: projectTitle as string,
            projectTitleString: JSON.stringify(projectTitle as string),
            frameworkVersionString: JSON.stringify(`^${process.env.npm_package_version}`)
          },
          effects
        );
        if (packageManager) {
          s.message(`Installing dependencies via ${packageManager}`);
          if (packageManager === "yarn") await writeFile(join(rootPath, "yarn.lock"), "");
          await promisify(exec)(installCommand, {cwd: rootPath});
        }
        if (initializeGit) {
          s.message("Initializing git repository");
          await effects.sleep(1000); // this step is fast; give the spinner a chance to show
          await promisify(exec)("git init", {cwd: rootPath});
          await promisify(exec)("git add -A", {cwd: rootPath});
        }
        if (packageManager) {
          s.message("Initializing Framework cache");
          try {
            await promisify(exec)(`${runCommand} build`, {cwd: rootPath});
          } catch {
            spinning = false;
            s.stop("Installed! 🎉");
            clack.log.warn(
              wrapAnsi(
                "Failed to initialize Framework cache. This may be a transient error loading data from external servers or downloading imported modules from jsDelivr; or it might be a network configuration issue such as a firewall blocking traffic. You can ignore this error for now and Framework will automatically try to download again on preview or build. If you continue to experience issues, please check your network configuration.",
                Math.min(80, effects.outputColumns)
              ) + `\n\nWant help? ${link("https://github.com/observablehq/framework/issues")}\n`
            );
          }
        }
        if (spinning) s.stop("Installed! 🎉");
        const instructions = [`cd ${rootPath}`, ...(packageManager ? [] : [installCommand]), `${runCommand} dev`];
        clack.note(instructions.map((line) => reset(cyan(line))).join("\n"), "Next steps…");
        clack.outro(`Problems? ${link("https://github.com/observablehq/framework/discussions")}`);
      }
    },
    {
      onCancel: () => {
        clack.cancel("create canceled");
        process.exit(0);
      }
    }
  );
}

function validateRootPath(rootPath: string, defaultError?: string): string | undefined {
  if (rootPath === "") return defaultError; // accept default value
  rootPath = normalize(rootPath);
  if (!canWriteRecursive(rootPath)) return "Path is not writable.";
  if (!existsSync(rootPath)) return;
  if (!statSync(rootPath).isDirectory()) return "File already exists.";
  if (!canWrite(rootPath)) return "Directory is not writable.";
  if (readdirSync(rootPath).length !== 0) return "Directory is not empty.";
}

function inferTitle(rootPath: string): string {
  return basename(rootPath!)
    .split(/[-_\s]/)
    .map(([c, ...rest]) => c.toUpperCase() + rest.join(""))
    .join(" ");
}

function canWrite(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function canWriteRecursive(path: string): boolean {
  while (true) {
    const dir = dirname(path);
    if (canWrite(dir)) return true;
    if (dir === path) break;
    path = dir;
  }
  return false;
}

async function recursiveCopyTemplate(
  inputRoot: string,
  outputRoot: string,
  context: Record<string, string>,
  effects: CreateEffects,
  stepPath: string = "."
) {
  const templatePath = join(inputRoot, stepPath);
  const templateStat = await stat(templatePath);
  let outputPath = join(outputRoot, stepPath);
  if (templateStat.isDirectory()) {
    try {
      await effects.mkdir(outputPath, {recursive: true});
    } catch {
      // that's ok
    }
    for (const entry of await readdir(templatePath)) {
      await recursiveCopyTemplate(inputRoot, outputRoot, context, effects, join(stepPath, entry));
    }
  } else {
    if (templatePath.endsWith(".DS_Store")) return;
    if (templatePath.endsWith(".tmpl")) {
      outputPath = outputPath.replace(/\.tmpl$/, "");
      let contents = await readFile(templatePath, "utf8");
      contents = contents.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
        const val = context[key];
        if (val) return val;
        throw new Error(`no template variable ${key}`);
      });
      await effects.writeFile(outputPath, contents);
    } else {
      await effects.copyFile(templatePath, outputPath);
    }
  }
}

function inferPackageManager(defaultValue: string | null): string | null {
  const userAgent = process.env["npm_config_user_agent"];
  if (!userAgent) return defaultValue;
  const pkgSpec = userAgent.split(" ")[0]!; // userAgent is non-empty, so this is always defined
  if (!pkgSpec) return defaultValue;
  const [name, version] = pkgSpec.split("/");
  if (!name || !version) return defaultValue;
  return name;
}
