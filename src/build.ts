import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {type Config} from "./config.js";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {prepareOutput, visitFiles, visitMarkdownFiles} from "./files.js";
import {createImportResolver, rewriteModule} from "./javascript/imports.js";
import type {Logger, Writer} from "./logger.js";
import {renderServerless} from "./render.js";
import {getClientPath, rollupClient} from "./rollup.js";
import {faint} from "./tty.js";
import {resolvePath} from "./url.js";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

// TODO Remove library helpers (e.g., duckdb) when they are published to npm.
const CLIENT_BUNDLES: [entry: string, name: string][] = [
  ["./src/client/index.js", "client.js"],
  ["./src/client/stdlib.js", "stdlib.js"],
  ["./src/client/stdlib/dash.js", "stdlib/dash.js"],
  ["./src/client/stdlib/dot.js", "stdlib/dot.js"],
  ["./src/client/stdlib/duckdb.js", "stdlib/duckdb.js"],
  ["./src/client/stdlib/mermaid.js", "stdlib/mermaid.js"],
  ["./src/client/stdlib/sqlite.js", "stdlib/sqlite.js"],
  ["./src/client/stdlib/tex.js", "stdlib/tex.js"],
  ["./src/client/stdlib/xlsx.js", "stdlib/xlsx.js"]
];

export interface BuildOptions {
  config: Config;
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
  {config, addPublic = true}: BuildOptions,
  effects: BuildEffects = new FileBuildEffects(config.output)
): Promise<void> {
  const {root} = config;

  // Make sure all files are readable before starting to write output files.
  let pageCount = 0;
  for await (const sourceFile of visitMarkdownFiles(root)) {
    await access(join(root, sourceFile), constants.R_OK);
    pageCount++;
  }
  if (!pageCount) throw new Error(`No pages found in ${root}`);
  effects.logger.log(`${faint("found")} ${pageCount} ${faint(`page${pageCount === 1 ? "" : "s"} in`)} ${root}`);

  // Render .md files, building a list of file attachments as we go.
  const files: string[] = [];
  const imports: string[] = [];
  for await (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    effects.output.write(`${faint("render")} ${sourcePath} ${faint("→")} `);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const render = await renderServerless(await readFile(sourcePath, "utf-8"), {path, ...config});
    const resolveFile = ({name}) => resolvePath(sourceFile, name);
    files.push(...render.files.map(resolveFile));
    imports.push(...render.imports.filter((i) => i.type === "local").map(resolveFile));
    await effects.writeFile(outputPath, render.html);
  }

  if (addPublic) {
    // Generate the client bundles.
    for (const [entry, name] of CLIENT_BUNDLES) {
      const clientPath = getClientPath(entry);
      const outputPath = join("_observablehq", name);
      effects.output.write(`${faint("bundle")} ${clientPath} ${faint("→")} `);
      const code = await rollupClient(clientPath, {minify: true});
      await effects.writeFile(outputPath, code);
    }
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
      const loader = Loader.find(root, file, {useStale: true});
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
    const contents = await rewriteModule(await readFile(sourcePath, "utf-8"), file, importResolver);
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

export class FileBuildEffects implements BuildEffects {
  private readonly outputRoot: string;
  readonly logger: Logger;
  readonly output: Writer;
  constructor(
    outputRoot: string,
    {logger = console, output = process.stdout}: {logger?: Logger; output?: Writer} = {}
  ) {
    if (!outputRoot) throw new Error("missing outputRoot");
    this.logger = logger;
    this.output = output;
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
