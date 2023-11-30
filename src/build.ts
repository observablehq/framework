import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {readConfig} from "./config.js";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {prepareOutput, visitFiles, visitMarkdownFiles} from "./files.js";
import {createImportResolver, rewriteModule} from "./javascript/imports.js";
import {renderServerless} from "./render.js";
import {makeCLIResolver} from "./resolver.js";
import {getClientPath, rollupClient} from "./rollup.js";
import {resolvePath} from "./url.js";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

export interface BuildOptions {
  sourceRoot: string;
  outputRoot: string;
  verbose?: boolean;
  addPublic?: boolean;
}

export async function build({sourceRoot, outputRoot, verbose = true, addPublic = true}: BuildOptions): Promise<void> {
  // Make sure all files are readable before starting to write output files.
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    await access(join(sourceRoot, sourceFile), constants.R_OK);
  }

  // Render .md files, building a list of file attachments as we go.
  const config = await readConfig(sourceRoot);
  const files: string[] = [];
  const imports: string[] = [];
  const resolver = await makeCLIResolver();
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    const sourcePath = join(sourceRoot, sourceFile);
    const outputPath = join(outputRoot, dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    if (verbose) console.log("render", sourcePath, "→", outputPath);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const render = await renderServerless(await readFile(sourcePath, "utf-8"), {
      root: sourceRoot,
      path,
      resolver,
      ...config
    });
    const resolveFile = ({name}) => resolvePath(sourceFile, name);
    files.push(...render.files.map(resolveFile));
    imports.push(...render.imports.filter((i) => i.type === "local").map(resolveFile));
    await prepareOutput(outputPath);
    await writeFile(outputPath, render.html);
  }

  if (addPublic) {
    // Generate the client bundle.
    const clientPath = getClientPath();
    const code = await rollupClient(clientPath, {minify: true});
    const outputPath = join(outputRoot, "_observablehq", "client.js");
    if (verbose) console.log("bundle", clientPath, "→", outputPath);
    await prepareOutput(outputPath);
    await writeFile(outputPath, code);
    // Copy over the public directory.
    const publicRoot = relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", "public"));
    for await (const publicFile of visitFiles(publicRoot)) {
      const sourcePath = join(publicRoot, publicFile);
      const outputPath = join(outputRoot, "_observablehq", publicFile);
      if (verbose) console.log("copy", sourcePath, "→", outputPath);
      await prepareOutput(outputPath);
      await copyFile(sourcePath, outputPath);
    }
  }

  // Copy over the referenced files.
  for (const file of files) {
    let sourcePath = join(sourceRoot, file);
    const outputPath = join(outputRoot, "_file", file);
    if (!existsSync(sourcePath)) {
      const loader = Loader.find(sourceRoot, file);
      if (!loader) {
        if (verbose) console.error("missing referenced file", sourcePath);
        continue;
      }
      try {
        sourcePath = join(sourceRoot, await loader.load({verbose}));
      } catch (error) {
        if (!isEnoent(error)) throw error;
        continue;
      }
    }
    if (verbose) console.log("copy", sourcePath, "→", outputPath);
    await prepareOutput(outputPath);
    await copyFile(sourcePath, outputPath);
  }

  // Copy over the imported modules.
  const importResolver = createImportResolver(sourceRoot);
  for (const file of imports) {
    const sourcePath = join(sourceRoot, file);
    const outputPath = join(outputRoot, "_import", file);
    if (!existsSync(sourcePath)) {
      if (verbose) console.error("missing referenced file", sourcePath);
      continue;
    }
    if (verbose) console.log("copy", sourcePath, "→", outputPath);
    await prepareOutput(outputPath);
    await writeFile(outputPath, rewriteModule(await readFile(sourcePath, "utf-8"), file, importResolver));
  }

  // Copy over required distribution files from node_modules.
  // TODO: Note that this requires that the build command be run relative to the node_modules directory.
  if (addPublic) {
    for (const [sourcePath, targetFile] of EXTRA_FILES) {
      const outputPath = join(outputRoot, targetFile);
      if (verbose) console.log("copy", sourcePath, "→", outputPath);
      await prepareOutput(outputPath);
      await copyFile(sourcePath, outputPath);
    }
  }
}
