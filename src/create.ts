#!/usr/bin/env node

import {existsSync} from "node:fs";
import {copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import {join, normalize, parse, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {type PromptObject, default as prompts} from "prompts";

export async function create({output = ""}: {output?: string}): Promise<void> {
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

  const root = join(projectDir, results.projectName);
  const pkgInfo = pkgFromUserAgent(process.env["npm_config_user_agent"]);
  const pkgManager = pkgInfo ? pkgInfo.name : "yarn";

  const templateDir = resolve(fileURLToPath(import.meta.url), "../../templates/default");

  const devDirections =
    pkgManager === "yarn" ? ["yarn", "yarn dev"] : [`${pkgManager} install`, `${pkgManager} run dev`];

  const context = {
    projectDir,
    ...results,
    devInstructions: devDirections.map((l) => `$ ${l}`).join("\n")
  };

  console.log(`Setting up project in ${root}...`);
  await recursiveCopyTemplate(templateDir, root, context);

  console.log("All done! To get started, run:\n");
  if (root !== process.cwd()) {
    console.log(`  cd ${root.includes(" ") ? `"${root}"` : root}`);
  }
  for (const line of devDirections) {
    console.log(`  ${line}`);
  }
}

function validateProjectName(projectDir: string, projectName: string): string | boolean {
  if (!existsSync(normalize(projectDir))) {
    return "The parent directory of the project does not exist.";
  }
  if (existsSync(join(projectDir, projectName))) {
    return "Project already exists.";
  }
  if (projectName.length === 0) {
    return "Project name must be at least 1 character long.";
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
  if (/[\x00-\x1F]/.test(projectTitle)) {
    return "Project title may not contain control characters.";
  }
  return true;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

async function recursiveCopyTemplate(
  inputRoot: string,
  outputRoot: string,
  context: Record<string, string>,
  stepPath: string = "."
) {
  const templatePath = join(inputRoot, stepPath);
  const templateStat = await stat(templatePath);
  let outputPath = join(outputRoot, stepPath);
  if (templateStat.isDirectory()) {
    try {
      await mkdir(outputPath);
    } catch {
      // that's ok
    }
    for (const entry of await readdir(templatePath)) {
      recursiveCopyTemplate(inputRoot, outputRoot, context, join(stepPath, entry));
    }
  } else {
    if (templatePath.endsWith(".tmpl")) {
      outputPath = outputPath.replace(/\.tmpl$/, "");
      let contents = await readFile(templatePath, "utf8");
      contents = contents.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
        const val = context[key];
        if (val) return val;
        throw new Error(`no template variable ${key}`);
      });
      await writeFile(outputPath, contents);
    } else {
      await copyFile(templatePath, outputPath);
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
