import {exec} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import * as clack from "@clack/prompts";
import untildify from "untildify";
import {version} from "../package.json";
import {accessSync, existsSync, readdirSync, statSync} from "./brandedFs.js";
import {constants, copyFile, mkdir, readFile, readdir, stat, writeFile} from "./brandedFs.js";
import {FilePath, fileBasename, fileDirname, fileJoin, fileNormalize, fileResolve, unFilePath} from "./brandedPath.js";
import type {ClackEffects} from "./clack.js";
import {cyan, faint, inverse, link, reset} from "./tty.js";

export interface CreateEffects {
  clack: ClackEffects;
  sleep: (delay?: number) => Promise<void>;
  log(output: string): void;
  mkdir(outputPath: FilePath, options?: {recursive?: boolean}): Promise<void>;
  copyFile(sourcePath: FilePath, outputPath: FilePath): Promise<void>;
  writeFile(outputPath: FilePath, contents: string): Promise<void>;
}

const defaultEffects: CreateEffects = {
  clack,
  sleep,
  log(output: string): void {
    console.log(output);
  },
  async mkdir(outputPath: FilePath, options): Promise<void> {
    await mkdir(outputPath, options);
  },
  async copyFile(sourcePath: FilePath, outputPath: FilePath): Promise<void> {
    await copyFile(sourcePath, outputPath);
  },
  async writeFile(outputPath: FilePath, contents: string): Promise<void> {
    await writeFile(outputPath, contents);
  }
};

// TODO Do we want to accept the output path as a command-line argument,
// still? It’s not sufficient to run observable create non-interactively,
// though we could just apply all the defaults in that case, and then expose
// command-line arguments for the other prompts. In any case, our immediate
// priority is supporting the interactive case, not the automated one.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function create(options = {}, effects: CreateEffects = defaultEffects): Promise<void> {
  const {clack} = effects;
  clack.intro(`${inverse(" observable create ")} ${faint(`v${version}`)}`);
  const defaultRootPath = FilePath("./hello-framework");
  const defaultRootPathError = validateRootPath(defaultRootPath);
  await clack.group(
    {
      rootPath: () =>
        clack.text({
          message: "Where to create your project?",
          placeholder: unFilePath(defaultRootPath),
          defaultValue: defaultRootPathError ? undefined : unFilePath(defaultRootPath),
          validate: (input) => validateRootPath(FilePath(input), defaultRootPathError)
        }),
      projectTitle: ({results: {rootPath: rootPathStr}}) => {
        const rootPath = FilePath(rootPathStr!);
        clack.text({
          message: "What to title your project?",
          placeholder: inferTitle(rootPath!),
          defaultValue: inferTitle(rootPath!)
        });
      },
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
          initialValue: inferPackageManager()
        }),
      initializeGit: () =>
        clack.confirm({
          message: "Initialize git repository?"
        }),
      installing: async ({results: {rootPath, projectTitle, includeSampleFiles, packageManager, initializeGit}}) => {
        const s = clack.spinner();
        s.start("Copying template files");
        const template = includeSampleFiles ? "default" : "empty";
        const templateDir = fileResolve(fileURLToPath(import.meta.url), "..", "..", "templates", template);
        const runCommand = packageManager === "yarn" ? "yarn" : `${packageManager ?? "npm"} run`;
        const installCommand = `${packageManager ?? "npm"} install`;
        await effects.sleep(1000);
        await recursiveCopyTemplate(
          templateDir,
          FilePath(untildify(rootPath!)),
          {
            runCommand,
            installCommand,
            rootPath: rootPath!,
            projectTitle: projectTitle as string,
            projectTitleString: JSON.stringify(projectTitle as string)
          },
          effects
        );
        if (packageManager) {
          s.message(`Installing dependencies via ${packageManager}`);
          await effects.sleep(1000);
          await promisify(exec)(installCommand, {cwd: rootPath});
        }
        if (initializeGit) {
          s.message("Initializing git repository");
          await effects.sleep(1000);
          await promisify(exec)("git init", {cwd: rootPath});
          await promisify(exec)("git add -A", {cwd: rootPath});
        }
        s.stop("Installed! 🎉");
        const instructions = [`cd ${rootPath}`, ...(packageManager ? [] : [installCommand]), `${runCommand} dev`];
        clack.note(instructions.map((line) => reset(cyan(line))).join("\n"), "Next steps…");
        clack.outro(`Problems? ${link("https://observablehq.com/framework/getting-started")}`);
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

function validateRootPath(rootPath: FilePath, defaultError?: string): string | undefined {
  if (rootPath === FilePath("")) return defaultError; // accept default value
  rootPath = fileNormalize(rootPath);
  if (!canWriteRecursive(rootPath)) return "Path is not writable.";
  if (!existsSync(rootPath)) return;
  if (!statSync(rootPath).isDirectory()) return "File already exists.";
  if (!canWrite(rootPath)) return "Directory is not writable.";
  if (readdirSync(rootPath).length !== 0) return "Directory is not empty.";
}

function inferTitle(rootPath: FilePath): string {
  return fileBasename(rootPath!)
    .split(/[-_\s]/)
    .map(([c, ...rest]) => c.toUpperCase() + rest.join(""))
    .join(" ");
}

function canWrite(path: FilePath): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function canWriteRecursive(path: FilePath): boolean {
  while (true) {
    const dir = fileDirname(path);
    if (canWrite(dir)) return true;
    if (dir === path) break;
    path = dir;
  }
  return false;
}

async function recursiveCopyTemplate(
  inputRoot: FilePath,
  outputRoot: FilePath,
  context: Record<string, string>,
  effects: CreateEffects,
  stepPath: FilePath = FilePath(".")
) {
  const templatePath = fileJoin(inputRoot, stepPath);
  const templateStat = await stat(templatePath);
  let outputPath = fileJoin(outputRoot, stepPath);
  if (templateStat.isDirectory()) {
    try {
      await effects.mkdir(outputPath, {recursive: true});
    } catch {
      // that's ok
    }
    for (const entry of await readdir(templatePath)) {
      await recursiveCopyTemplate(inputRoot, outputRoot, context, effects, fileJoin(stepPath, entry));
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

function inferPackageManager(): string | null {
  const userAgent = process.env["npm_config_user_agent"];
  if (!userAgent) return null;
  const pkgSpec = userAgent.split(" ")[0]!; // userAgent is non-empty, so this is always defined
  if (!pkgSpec) return null;
  const [name, version] = pkgSpec.split("/");
  if (!name || !version) return null;
  return name;
}
