import {existsSync} from "node:fs";
import {copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import {join, normalize, parse, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {type PromptObject, default as prompts} from "prompts";

export interface CreateEffects {
  log(output: string): void;
  mkdir(outputPath: string): Promise<void>;
  copyFile(sourcePath: string, outputPath: string): Promise<void>;
  writeFile(outputPath: string, contents: string): Promise<void>;
}

const defaultEffects: CreateEffects = {
  log(output: string): void {
    console.log(output);
  },
  async mkdir(outputPath: string): Promise<void> {
    await mkdir(outputPath);
  },
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    await copyFile(sourcePath, outputPath);
  },
  async writeFile(outputPath: string, contents: string): Promise<void> {
    await writeFile(outputPath, contents);
  }
};

export async function create({output = ""}: {output?: string}, effects: CreateEffects = defaultEffects): Promise<void> {
  const {dir: projectDir, name: projectNameArg} = parse(output);

  if (projectNameArg !== "") {
    const result = validateProjectName(projectDir, projectNameArg);
    if (result !== true) {
      console.error(`Invalid project "${join(projectDir, projectNameArg)}": ${result}`);
      process.exit(1);
    }
  }

  const results = await prompts<"projectName" | "projectTitle">([
    {
      type: "text",
      name: "projectName",
      message: "Project folder name:",
      initial: projectNameArg,
      validate: (name) => validateProjectName(projectDir, name)
    } satisfies PromptObject<"projectName">,
    {
      type: "text",
      name: "projectTitle",
      message: "Project title (visible on the pages):",
      initial: toTitleCase,
      validate: validateProjectTitle
    } satisfies PromptObject<"projectTitle">
  ]);

  if (results.projectName === undefined || results.projectTitle === undefined) {
    console.log("Create process aborted");
    process.exit(0);
  }

  const root = join(projectDir, results.projectName);
  const pkgInfo = pkgFromUserAgent(process.env["npm_config_user_agent"]);
  const pkgManager = pkgInfo ? pkgInfo.name : "yarn";

  const templateDir = resolve(fileURLToPath(import.meta.url), "../../templates/default");

  const devDirections =
    pkgManager === "yarn" ? ["yarn", "yarn dev"] : [`${pkgManager} install`, `${pkgManager} run dev`];

  const context = {
    projectDir,
    ...results,
    projectTitle: JSON.stringify(results.projectTitle).slice(1, -1),
    devInstructions: devDirections.map((l) => `$ ${l}`).join("\n")
  };

  effects.log(`Setting up project in ${root}...`);
  await recursiveCopyTemplate(templateDir, root, context, undefined, effects);

  effects.log("All done! To get started, run:\n");
  if (root !== process.cwd()) {
    effects.log(`  cd ${root.includes(" ") ? `"${root}"` : root}`);
  }
  for (const line of devDirections) {
    effects.log(`  ${line}`);
  }
}

function validateProjectName(projectDir: string, projectName: string): string | boolean {
  if (!existsSync(normalize(projectDir))) {
    return "The parent directory of the project does not exist.";
  }
  if (projectName.length === 0) {
    return "Project name must be at least 1 character long.";
  }
  if (existsSync(join(projectDir, projectName))) {
    return "Project already exists.";
  }
  if (!/^([^0-9\W][\w-]*)$/.test(projectName)) {
    return "Project name must contain only alphanumerics, dash or underscore with no leading digits.";
  }
  return true;
}

function validateProjectTitle(projectTitle: string): string | boolean {
  if (projectTitle.length === 0) {
    return "Project title must be at least 1 character long.";
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(projectTitle)) {
    return "Project title may not contain control characters.";
  }
  return true;
}

function toTitleCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(([c, ...rest]) => c.toUpperCase() + rest.join(""))
    .join(" ");
}

async function recursiveCopyTemplate(
  inputRoot: string,
  outputRoot: string,
  context: Record<string, string>,
  stepPath: string = ".",
  effects: CreateEffects
) {
  const templatePath = join(inputRoot, stepPath);
  const templateStat = await stat(templatePath);
  let outputPath = join(outputRoot, stepPath);
  if (templateStat.isDirectory()) {
    try {
      await effects.mkdir(outputPath); // TODO recursive?
    } catch {
      // that's ok
    }
    for (const entry of await readdir(templatePath)) {
      await recursiveCopyTemplate(inputRoot, outputRoot, context, join(stepPath, entry), effects);
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

function pkgFromUserAgent(userAgent: string | undefined): null | {
  name: string;
  version: string | undefined;
} {
  if (!userAgent) return null;
  const pkgSpec = userAgent.split(" ")[0]!; // userAgent is non-empty, so this is always defined
  if (!pkgSpec) return null;
  const [name, version] = pkgSpec.split("/");
  if (!name || !version) return null;
  return {name, version};
}
