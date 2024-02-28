import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join} from "node:path";
// import {fileURLToPath} from "node:url";
import type {Config, Style} from "./config.js";
import {Loader} from "./dataloader.js";
import {CliError, isEnoent} from "./error.js";
import {prepareOutput, visitMarkdownFiles} from "./files.js";
import {transpileModule} from "./javascript/transpile.js";
import type {Logger, Writer} from "./logger.js";
import {parseMarkdown} from "./markdown.js";
import {populateNpmCache} from "./npm.js";
import {resolvePath} from "./path.js";
import {renderPage} from "./render.js";
import {getResolvers} from "./resolvers.js";
import {Telemetry} from "./telemetry.js";
import {faint} from "./tty.js";

// const EXTRA_FILES = new Map([
//   [
//     join(fileURLToPath(import.meta.resolve("@observablehq/runtime")), "../../dist/runtime.js"),
//     "_observablehq/runtime.js"
//   ]
// ]);

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
  // const styles: Style[] = [];
  for await (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    effects.output.write(`${faint("render")} ${sourcePath} ${faint("→")} `);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const options = {path, ...config};
    const page = await parseMarkdown(sourcePath, options);
    const resolvers = await getResolvers(page, {root, path: sourceFile});
    const html = await renderPage(page, {...options, resolvers});
    for (const f of page.assets) files.add(resolvePath(sourceFile, f));
    for (const f of resolvers.files) files.add(resolvePath(sourceFile, f));
    for (const i of resolvers.localImports) localImports.add(resolvePath(sourceFile, i));
    for (const i of resolvers.globalImports) globalImports.add(resolvePath(sourceFile, resolvers.resolveImport(i)));
    // TODO parse.stylesheets
    await effects.writeFile(outputPath, html);
    // const style = mergeStyle(path, page.data?.style, page.data?.theme, config.style);
    // if (style && !styles.some((s) => styleEquals(s, style))) styles.push(style);
  }

  // Things to copy:
  // - files attachments and assets
  // - local imports
  // - global imports
  // - stylesheets

  // // Add imported local scripts.
  // for (const script of config.scripts) {
  //   if (!/^\w+:/.test(script.src)) {
  //     localImports.add(script.src);
  //   }
  // }

  // // Generate the client bundles.
  // if (addPublic) {
  //   const bundles: [entry: string, name: string][] = [];
  //   bundles.push([clientEntry, "client.js"]);
  //   bundles.push(["./src/client/stdlib.js", "stdlib.js"]);
  //   if (config.search) bundles.push(["./src/client/search.js", "search.js"]);
  //   for (const lib of ["dot", "duckdb", "inputs", "mermaid", "sqlite", "tex", "vega-lite", "xlsx", "zip"]) {
  //     if (globalImports.has(`npm:@observablehq/${lib}`)) {
  //       bundles.push([`./src/client/stdlib/${lib}.js`, `stdlib/${lib}.js`]);
  //     }
  //   }
  //   for (const lib of ["inputs"]) {
  //     if (globalImports.has(`npm:@observablehq/${lib}`)) {
  //       bundles.push([`./src/client/stdlib/${lib}.css`, `stdlib/${lib}.css`]);
  //     }
  //   }
  //   for (const [entry, name] of bundles) {
  //     const clientPath = getClientPath(entry);
  //     const outputPath = join("_observablehq", name);
  //     effects.output.write(`${faint("bundle")} ${clientPath} ${faint("→")} `);
  //     const code = await (entry.endsWith(".css")
  //       ? bundleStyles({path: clientPath})
  //       : rollupClient(clientPath, root, outputPath, {minify: true}));
  //     await effects.writeFile(outputPath, code);
  //   }
  //   if (config.search) {
  //     const outputPath = join("_observablehq", "minisearch.json");
  //     const code = await searchIndex(config, effects);
  //     effects.output.write(`${faint("search")} ${faint("→")} `);
  //     await effects.writeFile(outputPath, code);
  //   }
  //   for (const style of styles) {
  //     if ("path" in style) {
  //       const outputPath = join("_import", style.path);
  //       const sourcePath = join(root, style.path);
  //       effects.output.write(`${faint("style")} ${sourcePath} ${faint("→")} `);
  //       const code = await bundleStyles({path: sourcePath});
  //       await effects.writeFile(outputPath, code);
  //     } else {
  //       const outputPath = join("_observablehq", `theme-${style.theme}.css`);
  //       effects.output.write(`${faint("bundle")} theme-${style.theme}.css ${faint("→")} `);
  //       const code = await bundleStyles({theme: style.theme});
  //       await effects.writeFile(outputPath, code);
  //     }
  //   }
  // }

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

  // Download npm imports.
  for (const path of globalImports) {
    if (!path.startsWith("/_npm/")) continue; // skip _observablehq
    effects.output.write(`${faint("download")} ${path} ${faint("→")} `);
    const sourcePath = await populateNpmCache(root, path); // TODO effects
    await effects.copyFile(sourcePath, path);
  }

  // Copy over imported local modules.
  for (const path of localImports) {
    const sourcePath = join(root, path);
    const outputPath = join("_import", path);
    if (!existsSync(sourcePath)) {
      effects.logger.error("missing referenced file", sourcePath);
      continue;
    }
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    const contents = await transpileModule(await readFile(sourcePath, "utf-8"), root, outputPath, path);
    await effects.writeFile(outputPath, contents);
  }

  // // Copy over required distribution files.
  // if (addPublic) {
  //   for (const [sourcePath, outputPath] of EXTRA_FILES) {
  //     effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
  //     await effects.copyFile(sourcePath, outputPath);
  //   }
  // }

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
