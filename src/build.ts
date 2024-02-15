import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import type {Config, Style} from "./config.js";
import {mergeStyle} from "./config.js";
import {Loader} from "./dataloader.js";
import {CliError, isEnoent} from "./error.js";
import {getClientPath, prepareOutput, visitMarkdownFiles} from "./files.js";
import {createImportResolver, rewriteModule} from "./javascript/imports.js";
import type {Logger, Writer} from "./logger.js";
import {renderServerless} from "./render.js";
import {bundleStyles, rollupClient} from "./rollup.js";
import {searchIndex} from "./search.js";
import {Telemetry} from "./telemetry.js";
import {faint} from "./tty.js";
import {resolvePath} from "./url.js";

const EXTRA_FILES = new Map([
  [
    join(fileURLToPath(import.meta.resolve("@observablehq/runtime")), "../../dist/runtime.js"),
    "_observablehq/runtime.js"
  ]
]);

export interface BuildOptions {
  config: Config;
  clientEntry?: string;
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
  {config, addPublic = true, clientEntry = "./src/client/index.js"}: BuildOptions,
  effects: BuildEffects = new FileBuildEffects(config.output)
): Promise<void> {
  const {root} = config;
  Telemetry.record({event: "build", step: "start"});

  // Make sure all files are readable before starting to write output files.
  let pageCount = 0;
  for await (const sourceFile of visitMarkdownFiles(root)) {
    await access(join(root, sourceFile), constants.R_OK);
    pageCount++;
  }
  if (!pageCount) throw new CliError(`Nothing to build: no page files found in your ${root} directory.`);
  effects.logger.log(`${faint("found")} ${pageCount} ${faint(`page${pageCount === 1 ? "" : "s"} in`)} ${root}`);

  // Render .md files, building a list of file attachments as we go.
  const files = new Set<string>();
  const localImports = new Set<string>();
  const globalImports = new Set<string>();
  const styles: Style[] = [];
  for await (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    effects.output.write(`${faint("render")} ${sourcePath} ${faint("→")} `);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const render = await renderServerless(sourcePath, {path, ...config});
    const resolveFile = ({name}) => resolvePath(sourceFile, name);
    render.files.map(resolveFile).forEach(files.add, files);
    render.imports.filter((i) => i.type === "local").forEach((i) => localImports.add(resolveFile(i)));
    render.imports.filter((i) => i.type === "global").forEach((i) => globalImports.add(i.name));
    if (render.inputs.includes("FileAttachment")) {
      // TODO If you have a FileAttachment, you might also need to preload
      // - npm:d3-dsv if you call FileAttachment.csv or FileAttachment.tsv
      // - npm:apache-arrow if you call FileAttachment.arrow or FileAttachment.parquet
      // - npm:parquet-wasm if you call FileAttachment.parquet
      // - npm:@observablehq/sqlite if you call FileAttachment.sqlite
      // - npm:@observablehq/zip if you call FileAttachment.zip
      // - npm:@observablehq/xlsx if you call FileAttachment.xlsx
      globalImports.add("npm:@observablehq/sqlite");
      globalImports.add("npm:@observablehq/zip");
      globalImports.add("npm:@observablehq/xlsx");
    }
    await effects.writeFile(outputPath, render.html);
    const style = mergeStyle(path, render.data?.style, render.data?.theme, config.style);
    if (style && !styles.some((s) => styleEquals(s, style))) styles.push(style);
  }

  // Add imported local scripts.
  for (const script of config.scripts) {
    if (!/^\w+:/.test(script.src)) {
      localImports.add(script.src);
    }
  }

  // Generate the client bundles.
  if (addPublic) {
    const bundles: [entry: string, name: string][] = [];
    bundles.push([clientEntry, "client.js"]);
    bundles.push(["./src/client/stdlib.js", "stdlib.js"]);
    if (config.search) bundles.push(["./src/client/search.js", "search.js"]);
    for (const lib of ["dot", "duckdb", "inputs", "mermaid", "sqlite", "tex", "vega-lite", "xlsx", "zip"]) {
      if (globalImports.has(`npm:@observablehq/${lib}`)) {
        bundles.push([`./src/client/stdlib/${lib}.js`, `stdlib/${lib}.js`]);
      }
    }
    for (const lib of ["inputs"]) {
      if (globalImports.has(`npm:@observablehq/${lib}`)) {
        bundles.push([`./src/client/stdlib/${lib}.css`, `stdlib/${lib}.css`]);
      }
    }
    for (const [entry, name] of bundles) {
      const clientPath = getClientPath(entry);
      const outputPath = join("_observablehq", name);
      effects.output.write(`${faint("bundle")} ${clientPath} ${faint("→")} `);
      const code = await (entry.endsWith(".css")
        ? bundleStyles({path: clientPath})
        : rollupClient(clientPath, {minify: true}));
      await effects.writeFile(outputPath, code);
    }
    if (config.search) {
      const outputPath = join("_observablehq", "minisearch.json");
      const code = await searchIndex(config, effects);
      effects.output.write(`${faint("search")} ${faint("→")} `);
      await effects.writeFile(outputPath, code);
    }
    for (const style of styles) {
      if ("path" in style) {
        const outputPath = join("_import", style.path);
        const sourcePath = join(root, style.path);
        effects.output.write(`${faint("style")} ${sourcePath} ${faint("→")} `);
        const code = await bundleStyles({path: sourcePath});
        await effects.writeFile(outputPath, code);
      } else {
        const outputPath = join("_observablehq", `theme-${style.theme}.css`);
        effects.output.write(`${faint("bundle")} theme-${style.theme}.css ${faint("→")} `);
        const code = await bundleStyles({theme: style.theme});
        await effects.writeFile(outputPath, code);
      }
    }
  }

  // Copy over the referenced files.
  for (const file of files) {
    let sourcePath = join(root, file);
    const outputPath = join("_file", file);
    if (!existsSync(sourcePath)) {
      const loader = Loader.find(root, join("/", file), {useStale: true});
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
  for (const file of localImports) {
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

  // Copy over required distribution files.
  if (addPublic) {
    for (const [sourcePath, outputPath] of EXTRA_FILES) {
      effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
      await effects.copyFile(sourcePath, outputPath);
    }
  }
  Telemetry.record({event: "build", step: "finish", pageCount});
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

function styleEquals(a: Style, b: Style): boolean {
  return "path" in a && "path" in b
    ? a.path === b.path
    : "theme" in a && "theme" in b
    ? a.theme.join() === b.theme.join()
    : false;
}
