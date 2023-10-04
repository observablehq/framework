import {copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import util from "node:util";
import {renderServerless} from "./render.js";
import path from "node:path";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

async function build(context: CommandContext) {
  const {root = "./docs", output = "dist", files} = context;

  const sourceRootDirectory = path.normalize(root);
  const outputDirectory = path.normalize(output);

  if (files.length === 0) {
    files.push(sourceRootDirectory);
  }

  const sources: {
    outputPath: string;
    sourcePath: string;
    content: string;
  }[] = [];

  // Make sure all files are readable before starting to write output files.
  await visitFiles(files, outputDirectory, sourceRootDirectory, async (sourcePath, outputPath) => {
    if (!sourcePath.endsWith(".md")) return;
    outputPath = outputPath.replace(/\.md$/, ".html");
    try {
      const content = await readFile(sourcePath, "utf-8");
      sources.push({sourcePath, outputPath, content});
    } catch (error) {
      throw new Error(`Unable to read ${sourcePath}: ${error.message}`);
    }
  });

  // Render .md files, building a list of file attachments as we go.
  const fileAttachments: {name: string; mimeType: string}[] = [];
  for (const {content, outputPath, sourcePath} of sources) {
    console.log("render", sourcePath, "→", outputPath);
    const render = renderServerless(content);
    fileAttachments.push(...render.files.map((f) => ({...f, sourcePath})));
    const outputDirectory = outputPath.lastIndexOf("/") > 0 ? outputPath.slice(0, outputPath.lastIndexOf("/")) : null;
    if (outputDirectory) {
      try {
        await mkdir(outputDirectory, {recursive: true});
      } catch (error) {
        throw new Error(`Unable to create output directory ${outputDirectory}: ${error.message}`);
      }
    }
    await writeFile(outputPath, render.html);
  }

  // Copy over the public directory.
  await visitFiles("public", outputDirectory + "/_observablehq", "public", (sourcePath, outputPath) => {
    console.log("copy", sourcePath, "→", outputPath);
    return copyFile(sourcePath, outputPath);
  });

  // Copy over the referenced files
  // TODO: This needs more work and consideration for nested directories.
  await visitFiles(files, outputDirectory + "/_files", sourceRootDirectory, async (sourcePath, outputPath) => {
    const basename = path.basename(sourcePath);
    if (fileAttachments.some((f) => f.name === basename)) {
      console.log("copy", sourcePath, "→", outputPath);
      return copyFile(sourcePath, outputPath);
    }
  });

  // Copy over required distribution files from node_modules.
  // TODO: Note that this requires that the build command be run relative to the node_modules directory.
  for (const [sourcePath, targetPath] of EXTRA_FILES) {
    const outputPath = path.join(outputDirectory, targetPath);
    console.log("copy", sourcePath, "→", outputPath);
    await copyFile(sourcePath, outputPath);
  }
}

async function visitFiles(
  source: string | string[],
  output: string,
  root: string,
  visitor: (sourcePath: string, outputPath: string) => Promise<void>
) {
  const sourceRootDirectory = path.normalize(root);
  const outputDirectory = path.normalize(output);

  const visited = new Set<number>();
  const files: string[] = Array.isArray(source) ? source.map((file) => path.normalize(file)) : [path.normalize(source)];

  for (const file of files) {
    const sourcePath = path.normalize(file);
    const status = await stat(sourcePath);
    if (status.isDirectory()) {
      if (visited.has(status.ino)) throw new Error("Circular directory structure with " + sourcePath);
      visited.add(status.ino);
      for (const entry of await readdir(sourcePath)) {
        files.push(path.join(sourcePath, entry));
      }
      continue;
    }

    const subPath = sourcePath.startsWith(sourceRootDirectory + "/")
      ? sourcePath.slice(sourceRootDirectory.length + 1)
      : sourcePath;
    const outputPath = path.join(outputDirectory, subPath);

    const dest = outputPath.lastIndexOf("/") > 0 ? outputPath.slice(0, outputPath.lastIndexOf("/")) : null;
    if (dest) {
      try {
        await mkdir(dest, {recursive: true});
      } catch (error) {
        throw new Error(`Unable to create output directory ${dest}: ${error.message}`);
      }
    }

    await visitor(sourcePath, outputPath);
  }
}

// TODO We also need to copy over any referenced file attachments; these live in
// ./dist/_file (currently; perhaps they should be somewhere else)?

const USAGE = `Usage: build [--root dir] [--output dir] [files...]`;

interface CommandContext {
  root?: string;
  output?: string;
  files: string[];
}

function makeCommandContext(): CommandContext {
  const {values, positionals} = util.parseArgs({
    allowPositionals: true,
    options: {
      root: {
        type: "string",
        short: "r"
      },
      output: {
        type: "string",
        short: "o"
      }
    }
  });

  return {
    root: values.root,
    output: values.output,
    files: positionals
  };
}

await (async function () {
  const context = makeCommandContext();
  if (!context.files.length && !context.root) {
    console.error(USAGE);
    process.exit(1);
  }
  await build(context);
  process.exit(0);
})();
