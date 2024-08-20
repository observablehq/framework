import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, stat, writeFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path/posix";
import type {Config} from "./config.js";
import {CliError, isEnoent} from "./error.js";
import {getClientPath, prepareOutput, visitMarkdownFiles} from "./files.js";
import {getLocalModuleHash, getModuleHash, readJavaScript} from "./javascript/module.js";
import {transpileModule} from "./javascript/transpile.js";
import type {Logger, Writer} from "./logger.js";
import type {MarkdownPage} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {populateNpmCache, resolveNpmImport, rewriteNpmImports} from "./npm.js";
import {isAssetPath, isPathImport, relativePath, resolvePath} from "./path.js";
import {renderPage} from "./render.js";
import type {Resolvers} from "./resolvers.js";
import {getModuleResolver, getResolvers} from "./resolvers.js";
import {resolveImportPath, resolveStylesheetPath} from "./resolvers.js";
import {bundleStyles, rollupClient} from "./rollup.js";
import {searchIndex} from "./search.js";
import {Telemetry} from "./telemetry.js";
import {tree} from "./tree.js";
import {faint, green, magenta, red, yellow} from "./tty.js";

export interface BuildOptions {
  config: Config;
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

  writeBuildManifest(buildManifest: BuildManifest): Promise<void>;
}

export async function build(
  {config}: BuildOptions,
  effects: BuildEffects = new FileBuildEffects(config.output, join(config.root, ".observablehq", "cache"))
): Promise<void> {
  const {root, loaders, normalizePath, googlefonts} = config;
  Telemetry.record({event: "build", step: "start"});

  // Make sure all files are readable before starting to write output files.
  let pageCount = 0;
  for (const sourceFile of visitMarkdownFiles(root)) {
    await access(join(root, sourceFile), constants.R_OK);
    pageCount++;
  }
  if (!pageCount) throw new CliError(`Nothing to build: no page files found in your ${root} directory.`);
  effects.logger.log(`${faint("found")} ${pageCount} ${faint(`page${pageCount === 1 ? "" : "s"} in`)} ${root}`);

  // Parse .md files, building a list of additional assets as we go.
  const pages = new Map<string, {page: MarkdownPage; resolvers: Resolvers}>();
  const files = new Set<string>(); // e.g., "/assets/foo.png"
  const localImports = new Set<string>(); // e.g., "/components/foo.js"
  const globalImports = new Set<string>(); // e.g., "/_observablehq/search.js"
  const stylesheets = new Set<string>(); // e.g., "/style.css"
  for (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const options = {path, ...config};
    effects.output.write(`${faint("parse")} ${sourcePath} `);
    const start = performance.now();
    const source = await readFile(sourcePath, "utf8");
    const page = parseMarkdown(source, options);
    if (page.data.draft) {
      effects.logger.log(faint("(skipped)"));
      continue;
    }
    const resolvers = await getResolvers(page, {root, path: sourceFile, normalizePath, loaders, googlefonts});
    const elapsed = Math.floor(performance.now() - start);
    for (const f of resolvers.assets) files.add(resolvePath(sourceFile, f));
    for (const f of resolvers.files) files.add(resolvePath(sourceFile, f));
    for (const i of resolvers.localImports) localImports.add(resolvePath(sourceFile, i));
    for (let i of resolvers.globalImports) if (isPathImport((i = resolvers.resolveImport(i)))) globalImports.add(resolvePath(sourceFile, i)); // prettier-ignore
    for (const s of resolvers.stylesheets) stylesheets.add(/^\w+:/.test(s) ? s : resolvePath(sourceFile, s));
    effects.output.write(`${faint("in")} ${(elapsed >= 100 ? yellow : faint)(`${elapsed}ms`)}\n`);
    pages.set(sourceFile, {page, resolvers});
  }

  // For cache-breaking we rename most assets to include content hashes.
  const aliases = new Map<string, string>();
  const cacheRoot = join(root, ".observablehq", "cache");

  // Add the search bundle and data, if needed.
  if (config.search) {
    globalImports.add("/_observablehq/search.js").add("/_observablehq/minisearch.json");
    const contents = await searchIndex(config, effects);
    effects.output.write(`${faint("index →")} `);
    const cachePath = join(cacheRoot, "_observablehq", "minisearch.json");
    await prepareOutput(cachePath);
    await writeFile(cachePath, contents);
    effects.logger.log(cachePath);
  }

  // Generate the client bundles. These are initially generated into the cache
  // because we need to rewrite any npm and node imports to be hashed; this is
  // handled generally for all global imports below.
  for (const path of globalImports) {
    if (path.startsWith("/_observablehq/") && path.endsWith(".js")) {
      const cachePath = join(cacheRoot, path);
      effects.output.write(`${faint("bundle")} ${path} ${faint("→")} `);
      const clientPath = getClientPath(path === "/_observablehq/client.js" ? "index.js" : path.slice("/_observablehq/".length)); // prettier-ignore
      const define: {[key: string]: string} = {};
      const contents = await rollupClient(clientPath, root, path, {minify: true, keepNames: true, define});
      await prepareOutput(cachePath);
      await writeFile(cachePath, contents);
      effects.logger.log(cachePath);
    }
  }

  // Copy over the stylesheets, accumulating hashed aliases.
  for (const specifier of stylesheets) {
    if (specifier.startsWith("observablehq:")) {
      let contents: string;
      const path = `/_observablehq/${specifier.slice("observablehq:".length)}`;
      effects.output.write(`${faint("build")} ${path} ${faint("→")} `);
      if (specifier.startsWith("observablehq:theme-")) {
        const match = /^observablehq:theme-(?<theme>[\w-]+(,[\w-]+)*)?\.css$/.exec(specifier);
        contents = await bundleStyles({theme: match!.groups!.theme?.split(",") ?? [], minify: true});
      } else {
        const clientPath = getClientPath(path.slice("/_observablehq/".length));
        contents = await bundleStyles({path: clientPath, minify: true});
      }
      const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
      const alias = applyHash(path, hash);
      aliases.set(path, alias);
      await effects.writeFile(alias, contents);
    } else if (specifier.startsWith("npm:")) {
      effects.output.write(`${faint("copy")} ${specifier} ${faint("→")} `);
      const path = await resolveNpmImport(root, specifier.slice("npm:".length));
      const sourcePath = await populateNpmCache(root, path); // TODO effects
      await effects.copyFile(sourcePath, path);
    } else if (!/^\w+:/.test(specifier)) {
      const sourcePath = join(root, specifier);
      effects.output.write(`${faint("build")} ${sourcePath} ${faint("→")} `);
      const contents = await bundleStyles({path: sourcePath, minify: true});
      const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
      const alias = applyHash(join("/_import", specifier), hash);
      aliases.set(resolveStylesheetPath(root, specifier), alias);
      await effects.writeFile(alias, contents);
    }
  }

  // Copy over referenced files, accumulating hashed aliases.
  for (const file of files) {
    let sourcePath = join(root, file);
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    if (!existsSync(sourcePath)) {
      const loader = loaders.find(join("/", file), {useStale: true});
      if (!loader) {
        effects.logger.error(red("error: missing referenced file"));
        continue;
      }
      try {
        sourcePath = join(root, await loader.load(effects));
      } catch (error) {
        if (!isEnoent(error)) throw error;
        effects.logger.error(red("error: missing referenced file"));
        continue;
      }
    }
    const contents = await readFile(sourcePath);
    const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
    const alias = applyHash(join("/_file", file), hash);
    aliases.set(loaders.resolveFilePath(file), alias);
    await effects.writeFile(alias, contents);
  }

  // Copy over global assets (e.g., minisearch.json, DuckDB’s WebAssembly).
  // Anything in _observablehq also needs a content hash, but anything in _npm
  // or _node does not (because they are already necessarily immutable).
  for (const path of globalImports) {
    if (path.endsWith(".js")) continue;
    const sourcePath = join(cacheRoot, path);
    effects.output.write(`${faint("build")} ${path} ${faint("→")} `);
    if (path.startsWith("/_observablehq/")) {
      const contents = await readFile(sourcePath, "utf-8");
      const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
      const alias = applyHash(path, hash);
      aliases.set(path, alias);
      await effects.writeFile(alias, contents);
    } else {
      await effects.copyFile(sourcePath, path);
    }
  }

  // Compute the hashes for global modules. By computing the hash on the file in
  // the cache root, this takes into consideration the resolved exact versions
  // of npm and node imports for transitive dependencies.
  for (const path of globalImports) {
    if (!path.endsWith(".js")) continue;
    const hash = getModuleHash(cacheRoot, path).slice(0, 8);
    const alias = applyHash(path, hash);
    effects.logger.log(`${faint("alias")} ${path} ${faint("→")} ${alias}`);
    aliases.set(path, alias);
  }

  // Copy over global imports, applying aliases. Note that unused standard
  // library imports (say parquet-wasm if you never use FileAttachment.parquet)
  // may not be present in aliases and not included in the output build; these
  // imports therefore will not have associated hashes.
  for (const path of globalImports) {
    if (!path.endsWith(".js")) continue;
    const sourcePath = join(cacheRoot, path);
    effects.output.write(`${faint("build")} ${path} ${faint("→")} `);
    const resolveImport = (i: string) => relativePath(path, aliases.get((i = resolvePath(path, i))) ?? i);
    await effects.writeFile(aliases.get(path)!, rewriteNpmImports(await readFile(sourcePath, "utf-8"), resolveImport));
  }

  // Copy over imported local modules, overriding import resolution so that
  // module hash is incorporated into the file name rather than in the query
  // string. Note that this hash is not of the content of the module itself, but
  // of the transitive closure of the module and its imports and files.
  const resolveLocalImport = async (path: string): Promise<string> => {
    const hash = (await getLocalModuleHash(root, path)).slice(0, 8);
    return applyHash(join("/_import", path), hash);
  };
  for (const path of localImports) {
    const sourcePath = join(root, path);
    const importPath = join("_import", path);
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    const resolveImport = getModuleResolver(root, path);
    let input: string;
    try {
      input = await readJavaScript(sourcePath);
    } catch (error) {
      if (!isEnoent(error)) throw error;
      effects.logger.error(red("error: missing referenced import"));
      continue;
    }
    const contents = await transpileModule(input, {
      root,
      path,
      async resolveImport(specifier) {
        let resolution: string;
        if (isPathImport(specifier)) {
          resolution = await resolveLocalImport(resolvePath(path, specifier));
        } else {
          resolution = await resolveImport(specifier);
          if (isPathImport(resolution)) {
            resolution = resolvePath(importPath, resolution);
            resolution = aliases.get(resolution) ?? resolution;
          }
        }
        return relativePath(importPath, resolution);
      }
    });
    const alias = await resolveLocalImport(path);
    aliases.set(resolveImportPath(root, path), alias);
    await effects.writeFile(alias, contents);
  }

  // Wrap the resolvers to apply content-hashed file names.
  for (const [sourceFile, page] of pages) {
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const {resolvers} = page;
    pages.set(sourceFile, {
      ...page,
      resolvers: {
        ...resolvers,
        resolveFile(specifier) {
          const r = resolvers.resolveFile(specifier);
          const a = aliases.get(resolvePath(path, r));
          return a ? relativePath(path, a) : specifier; // fallback to specifier if enoent
        },
        resolveStylesheet(specifier) {
          const r = resolvers.resolveStylesheet(specifier);
          const a = aliases.get(resolvePath(path, r));
          return a ? relativePath(path, a) : isPathImport(specifier) ? specifier : r; // fallback to specifier if enoent
        },
        resolveImport(specifier) {
          const r = resolvers.resolveImport(specifier);
          const a = aliases.get(resolvePath(path, r));
          return a ? relativePath(path, a) : isPathImport(specifier) ? specifier : r; // fallback to specifier if enoent
        },
        resolveScript(specifier) {
          const r = resolvers.resolveScript(specifier);
          const a = aliases.get(resolvePath(path, r));
          return a ? relativePath(path, a) : specifier; // fallback to specifier if enoent
        }
      }
    });
  }

  // Render pages!
  const buildManifest: BuildManifest = {pages: []};
  for (const [sourceFile, {page, resolvers}] of pages) {
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    effects.output.write(`${faint("render")} ${path} ${faint("→")} `);
    const html = await renderPage(page, {...config, path, resolvers});
    await effects.writeFile(outputPath, html);
    const urlPath = config.normalizePath("/" + outputPath);
    buildManifest.pages.push({path: urlPath, title: page.title});
  }

  // Write the build manifest.
  await effects.writeBuildManifest(buildManifest);
  // Log page sizes.
  const columnWidth = 12;
  effects.logger.log("");
  for (const [indent, name, description, node] of tree(pages)) {
    if (node.children) {
      effects.logger.log(
        `${faint(indent)}${name}${faint(description)} ${
          node.depth ? "" : ["Page", "Imports", "Files"].map((name) => name.padStart(columnWidth)).join(" ")
        }`
      );
    } else {
      const [sourceFile, {resolvers}] = node.data!;
      const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
      const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
      const resolveOutput = (name: string) => join(config.output, resolvePath(path, name));
      const pageSize = (await stat(join(config.output, outputPath))).size;
      const importSize = await accumulateSize(resolvers.staticImports, resolvers.resolveImport, resolveOutput);
      const fileSize =
        (await accumulateSize(resolvers.files, resolvers.resolveFile, resolveOutput)) +
        (await accumulateSize(resolvers.assets, resolvers.resolveFile, resolveOutput)) +
        (await accumulateSize(resolvers.stylesheets, resolvers.resolveStylesheet, resolveOutput));
      effects.logger.log(
        `${faint(indent)}${name}${description} ${[pageSize, importSize, fileSize]
          .map((size) => formatBytes(size, columnWidth))
          .join(" ")}`
      );
    }
  }
  effects.logger.log("");

  Telemetry.record({event: "build", step: "finish", pageCount});
}

function applyHash(path: string, hash: string): string {
  const ext = extname(path);
  let name = basename(path, ext);
  if (path.endsWith(".js")) name = name.replace(/(^|\.)_esm$/, ""); // allow hash to replace _esm
  return join(dirname(path), `${name && `${name}.`}${hash}${ext}`);
}

async function accumulateSize(
  files: Iterable<string>,
  resolveFile: (path: string) => string,
  resolveOutput: (path: string) => string
): Promise<number> {
  let size = 0;
  for (const file of files) {
    const fileResolution = resolveFile(file);
    if (isAssetPath(fileResolution)) {
      try {
        size += (await stat(resolveOutput(fileResolution))).size;
      } catch {
        // ignore missing file
      }
    }
  }
  return size;
}

function formatBytes(size: number, length: number, locale: Intl.LocalesArgument = "en-US"): string {
  let color: (text: string) => string;
  let text: string;
  if (size < 1e3) {
    text = "<1 kB";
    color = faint;
  } else if (size < 1e6) {
    text = (size / 1e3).toLocaleString(locale, {maximumFractionDigits: 0}) + " kB";
    color = green;
  } else {
    text = (size / 1e6).toLocaleString(locale, {minimumFractionDigits: 3, maximumFractionDigits: 3}) + " MB";
    color = size < 10e6 ? yellow : size < 50e6 ? magenta : red;
  }
  return color(text.padStart(length));
}

export class FileBuildEffects implements BuildEffects {
  private readonly outputRoot: string;
  private readonly cacheDir: string;
  readonly logger: Logger;
  readonly output: Writer;
  constructor(
    outputRoot: string,
    cacheDir: string,
    {logger = console, output = process.stdout}: {logger?: Logger; output?: Writer} = {}
  ) {
    if (!outputRoot) throw new Error("missing outputRoot");
    this.logger = logger;
    this.output = output;
    this.outputRoot = outputRoot;
    this.cacheDir = cacheDir;
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
  async writeBuildManifest(buildManifest: BuildManifest): Promise<void> {
    const destination = join(this.cacheDir, "_build.json");
    await prepareOutput(destination);
    await writeFile(destination, JSON.stringify(buildManifest));
  }
}

export interface BuildManifest {
  pages: {path: string; title: string | null}[];
}
