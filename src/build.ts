import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join, normalize, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {findLoader, runLoader} from "./dataloader.js";
import {maybeStat, prepareOutput, visitFiles, visitMarkdownFiles} from "./files.js";
import {readPages} from "./navigation.js";
import {renderServerless} from "./render.js";
import {makeCLIResolver} from "./resolver.js";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

async function build(context: CommandContext) {
  const {sourceRoot, outputRoot} = context;

  // Make sure all files are readable before starting to write output files.
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    await access(join(sourceRoot, sourceFile), constants.R_OK);
  }

  // Render .md files, building a list of file attachments as we go.
  const pages = await readPages(sourceRoot);
  const files: string[] = [];
  const resolver = await makeCLIResolver();
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    const sourcePath = join(sourceRoot, sourceFile);
    const outputPath = join(outputRoot, join(dirname(sourceFile), basename(sourceFile, ".md") + ".html"));
    console.log("render", sourcePath, "→", outputPath);
    const path = `/${join(dirname(sourceFile), basename(sourceFile, ".md"))}`;
    const render = renderServerless(await readFile(sourcePath, "utf-8"), {
      root: sourceRoot,
      path,
      pages,
      resolver
    });
    files.push(...render.files.map((f) => f.name));
    await prepareOutput(outputPath);
    await writeFile(outputPath, render.html);
  }

  // Copy over the public directory.
  const publicRoot = join(dirname(relative(cwd(), fileURLToPath(import.meta.url))), "..", "public");
  for await (const publicFile of visitFiles(publicRoot)) {
    const sourcePath = join(publicRoot, publicFile);
    const outputPath = join(outputRoot, "_observablehq", publicFile);
    console.log("copy", sourcePath, "→", outputPath);
    await prepareOutput(outputPath);
    await copyFile(sourcePath, outputPath);
  }

  // Copy over the referenced files.
  for (const file of files) {
    const sourcePath = join(sourceRoot, file);
    const outputPath = join(outputRoot, "_file", file);
    const stats = await maybeStat(sourcePath);
    if (!stats) {
      const loader = await findLoader(sourcePath);
      if (!loader) {
        console.error("missing referenced file", sourcePath);
        continue;
      }
      const {path} = loader;
      console.log("generate", path, "→", outputPath);
      await runLoader(path, outputPath);
      continue;
    }
    console.log("copy", sourcePath, "→", outputPath);
    await prepareOutput(outputPath);
    await copyFile(sourcePath, outputPath);
  }

  // Copy over required distribution files from node_modules.
  // TODO: Note that this requires that the build command be run relative to the node_modules directory.
  for (const [sourcePath, targetFile] of EXTRA_FILES) {
    const outputPath = join(outputRoot, targetFile);
    console.log("copy", sourcePath, "→", outputPath);
    await prepareOutput(outputPath);
    await copyFile(sourcePath, outputPath);
  }
}

const USAGE = `Usage: observable build [--root dir] [--output dir]`;

interface CommandContext {
  sourceRoot: string;
  outputRoot: string;
}

function makeCommandContext(): CommandContext {
  const {values} = parseArgs({
    options: {
      root: {
        type: "string",
        short: "r",
        default: "docs"
      },
      output: {
        type: "string",
        short: "o",
        default: "dist"
      }
    }
  });
  if (!values.root || !values.output) {
    console.error(USAGE);
    process.exit(1);
  }
  return {
    sourceRoot: normalize(values.root).replace(/\/$/, ""),
    outputRoot: normalize(values.output).replace(/\/$/, "")
  };
}

await (async function () {
  const context = makeCommandContext();
  await build(context);
  process.exit(0);
})();
