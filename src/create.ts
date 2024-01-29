import {exec} from "node:child_process";
import {existsSync} from "node:fs";
import {copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import {basename, dirname, join, normalize, resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {cancel, confirm, group, intro, note, outro, select, spinner, text} from "@clack/prompts";
import pc from "picocolors";

export interface CreateEffects {
  log(output: string): void;
  mkdir(outputPath: string, options?: {recursive?: boolean}): Promise<void>;
  copyFile(sourcePath: string, outputPath: string): Promise<void>;
  writeFile(outputPath: string, contents: string): Promise<void>;
}

const defaultEffects: CreateEffects = {
  log(output: string): void {
    console.log(output);
  },
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

// TODO Do we want to accept the output path as a command-line argument,
// still? It’s not sufficient to run observable create non-interactively,
// though we could just apply all the defaults in that case, and then expose
// command-line arguments for the other prompts. In any case, our immediate
// priority is supporting the interactive case, not the automated one.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function create(options = {}, effects: CreateEffects = defaultEffects): Promise<void> {
  intro(pc.inverse(" observable create "));
  await group(
    {
      rootPath: () =>
        text({
          message: "Where to create your project?",
          placeholder: "./hello-framework",
          defaultValue: "./hello-framework",
          validate: validateRootPath
        }),
      includeSampleFiles: () =>
        select({
          message: "Include sample files to help you get started?",
          options: [
            {value: true, label: "Yes, include sample files", hint: "recommended"},
            {value: false, label: "No, create an empty project"}
          ],
          initialValue: true
        }),
      packageManager: () =>
        select({
          message: "Install dependencies?",
          options: [
            {value: "npm", label: "Yes, via npm", hint: "recommended"},
            {value: "yarn", label: "Yes, via yarn", hint: "recommended"},
            {value: null, label: "No"}
          ],
          initialValue: inferPackageManager()
        }),
      initializeGit: () =>
        confirm({
          message: "Initialize git repository?"
        }),
      installing: async ({results: {rootPath, includeSampleFiles, packageManager, initializeGit}}) => {
        const s = spinner();
        s.start("Copying template files");
        const template = includeSampleFiles ? "default" : "empty";
        const templateDir = resolve(fileURLToPath(import.meta.url), "..", "..", "templates", template);
        const title = basename(rootPath!);
        const runCommand = packageManager === "yarn" ? "yarn" : `${packageManager ?? "npm"} run`;
        const installCommand = packageManager === "yarn" ? "yarn" : `${packageManager ?? "npm"} install`;
        await sleep(1000);
        await recursiveCopyTemplate(
          templateDir,
          rootPath!,
          {
            runCommand,
            installCommand,
            rootPath: rootPath!,
            projectTitle: title,
            projectTitleString: JSON.stringify(title)
          },
          effects
        );
        if (packageManager) {
          s.message(`Installing dependencies via ${packageManager}`);
          await sleep(1000);
          await promisify(exec)(packageManager, {cwd: rootPath});
        }
        if (initializeGit) {
          s.message("Initializing git repository");
          await sleep(1000);
          await promisify(exec)("git init", {cwd: rootPath});
          await promisify(exec)("git add -A", {cwd: rootPath});
        }
        s.stop("Installed!");
        const instructions = [`cd ${rootPath}`, `${runCommand} dev`];
        note(instructions.map((line) => pc.reset(pc.cyan(line))).join("\n"), "Next steps…");
        outro("Problems? https://cli.observablehq.com/getting-started");
        process.exit(0);
      }
    },
    {
      onCancel: () => {
        cancel("create cancelled");
        process.exit(0);
      }
    }
  );
}

function validateRootPath(rootPath: string): string | void {
  if (rootPath === "") return; // accept default value
  rootPath = normalize(rootPath);
  if (!["/", "../", "./"].some((prefix) => rootPath.startsWith(prefix))) rootPath = join(".", rootPath);
  if (rootPath.length === 0) {
    return "Project name must be at least 1 character long.";
  }
  if (!existsSync(dirname(rootPath))) {
    return "Parent directory does not exist.";
  }
  if (existsSync(rootPath)) {
    return "Directory already exists.";
  }
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

function inferPackageManager(): string | null {
  const userAgent = process.env["npm_config_user_agent"];
  if (!userAgent) return null;
  const pkgSpec = userAgent.split(" ")[0]!; // userAgent is non-empty, so this is always defined
  if (!pkgSpec) return null;
  const [name, version] = pkgSpec.split("/");
  if (!name || !version) return null;
  return name;
}
