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
import type {Logger, Writer} from "./logger.js";
import {renderServerless} from "./render.js";
import {makeCLIResolver} from "./resolver.js";
import {getClientPath, rollupClient} from "./rollup.js";
import {faint} from "./tty.js";
import {resolvePath} from "./url.js";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

export interface BuildOptions {
  sourceRoot: string;
  clientEntry?: string;
  outputRoot?: string;
  addPublic?: boolean;
}

export interface BuildEffects {
  logger: Logger;
  output: Writer;

  /**
   * @param outputPath The path of this file relative to the outputRoot. For
   * example, in a local build this should be relative to the dist directory.
   */
  copyFile(sourcePath: string, outputPath: string): Promise<void>;

  /**
   * @param outputPath The path of this file relative to the outputRoot. For
   * example, in a local build this should be relative to the dist directory.
   */
  writeFile(outputPath: string, contents: Buffer | string): Promise<void>;
}

export async function build(
  {sourceRoot: root, clientEntry = "index.js", outputRoot, addPublic = true}: BuildOptions,
  effects: BuildEffects = new DefaultEffects(outputRoot)
): Promise<void> {
  // Make sure all files are readable before starting to write output files.
  for await (const sourceFile of visitMarkdownFiles(root)) {
    await access(join(root, sourceFile), constants.R_OK);
  }

  // Render .md files, building a list of file attachments as we go.
  const config = await readConfig(root);
  const files: string[] = [];
  const imports: string[] = [];
  const resolver = await makeCLIResolver();
  for await (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    effects.output.write(`${faint("render")} ${sourcePath} ${faint("→")} `);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const render = await renderServerless(await readFile(sourcePath, "utf-8"), {root, path, resolver, ...config});
    const resolveFile = ({name}) => resolvePath(sourceFile, name);
    files.push(...render.files.map(resolveFile));
    imports.push(...render.imports.filter((i) => i.type === "local").map(resolveFile));
    await effects.writeFile(outputPath, render.html);
  }

  if (addPublic) {
    // Generate the client bundle.
    const clientPath = getClientPath(clientEntry);
    const outputPath = join("_observablehq", "client.js");
    effects.output.write(`${faint("bundle")} ${clientPath} ${faint("→")} `);
    const code = await rollupClient(clientPath, {minify: true});
    await effects.writeFile(outputPath, code);
    // Copy over the public directory.
    const publicRoot = relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", "public"));
    for await (const publicFile of visitFiles(publicRoot)) {
      const sourcePath = join(publicRoot, publicFile);
      const outputPath = join("_observablehq", publicFile);
      effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
      await effects.copyFile(sourcePath, outputPath);
    }
  }

  // Copy over the referenced files.
  for (const file of files) {
    let sourcePath = join(root, file);
    const outputPath = join("_file", file);
    if (!existsSync(sourcePath)) {
      const loader = Loader.find(root, file);
      if (!loader) {
        effects.logger.error("missing referenced file", sourcePath);
        continue;
      }
      try {
        sourcePath = join(root, await loader.load(effects));
      } catch (error) {
        if (!isEnoent(error)) throw error;
        continue;
      }
    }
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    await effects.copyFile(sourcePath, outputPath);
  }

  // Copy over the imported modules.
  const importResolver = createImportResolver(root);
  for (const file of imports) {
    const sourcePath = join(root, file);
    const outputPath = join("_import", file);
    if (!existsSync(sourcePath)) {
      effects.logger.error("missing referenced file", sourcePath);
      continue;
    }
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    const contents = rewriteModule(await readFile(sourcePath, "utf-8"), file, importResolver);
    await effects.writeFile(outputPath, contents);
  }

  // Copy over required distribution files from node_modules.
  // TODO: Note that this requires that the build command be run relative to the node_modules directory.
  if (addPublic) {
    for (const [sourcePath, outputPath] of EXTRA_FILES) {
      effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
      await effects.copyFile(sourcePath, outputPath);
    }
  }
}

class DefaultEffects implements BuildEffects {
  private readonly outputRoot: string;
  readonly logger: Logger;
  readonly output: Writer;
  constructor(outputRoot?: string) {
    if (!outputRoot) throw new Error("missing outputRoot");
    this.logger = console;
    this.output = process.stdout;
    this.outputRoot = outputRoot;
  }
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    this.logger.log(destination);
    await prepareOutput(destination);
    await copyFile(sourcePath, destination);
  }
  async writeFile(outputPath: string, contents: string | Buffer): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    this.logger.log(destination);
    await prepareOutput(destination);
    await writeFile(destination, contents);
  }
}
