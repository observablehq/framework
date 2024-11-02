import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {copyFile, readFile, rm, stat, writeFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path/posix";
import type {Config} from "./config.js";
import {getDuckDBManifest} from "./duckdb.js";
import {CliError} from "./error.js";
import {getClientPath, prepareOutput} from "./files.js";
import {findModule, getModuleHash, readJavaScript} from "./javascript/module.js";
import {transpileModule} from "./javascript/transpile.js";
import type {Logger, Writer} from "./logger.js";
import type {MarkdownPage} from "./markdown.js";
import {populateNpmCache, resolveNpmImport, rewriteNpmImports} from "./npm.js";
import {isAssetPath, isPathImport, relativePath, resolvePath, within} from "./path.js";
import {renderModule, renderPage} from "./render.js";
import type {Resolvers} from "./resolvers.js";
import {getModuleResolvers, getResolvers} from "./resolvers.js";
import {resolveStylesheetPath} from "./resolvers.js";
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
   * Does any pre-build work, such as emptying the existing outputRoot.
   */
  prepare(): Promise<void>;

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
  const {root, loaders, duckdb} = config;
  Telemetry.record({event: "build", step: "start"});

  // Prepare for build (such as by emptying the existing output root).
  await effects.prepare();

  // Accumulate outputs.
  const outputs = new Map<string, ({type: "page"; page: MarkdownPage} | {type: "module"}) & {resolvers: Resolvers}>();
  const files = new Set<string>(); // e.g., "/assets/foo.png"
  const localImports = new Set<string>(); // e.g., "/components/foo.js"
  const globalImports = new Set<string>(); // e.g., "/_observablehq/search.js"
  const stylesheets = new Set<string>(); // e.g., "/style.css"
  const addFile = (path: string, f: string) => files.add(resolvePath(path, f));
  const addLocalImport = (path: string, i: string) => localImports.add(resolvePath(path, i));
  const addGlobalImport = (path: string, i: string) => isPathImport(i) && globalImports.add(resolvePath(path, i));
  const addStylesheet = (path: string, s: string) => stylesheets.add(/^\w+:/.test(s) ? s : resolvePath(path, s));

  // Load pages, building a list of additional assets as we go.
  let assetCount = 0;
  let pageCount = 0;
  const pagePaths = new Set<string>();
  for await (const path of config.paths()) {
    effects.output.write(`${faint("load")} ${path} `);
    const start = performance.now();
    const options = {path, ...config};
    if (path.endsWith(".js")) {
      const module = findModule(root, path);
      if (module) {
        const resolvers = await getModuleResolvers(path, config);
        const elapsed = Math.floor(performance.now() - start);
        for (const f of resolvers.files) addFile(path, f);
        for (const i of resolvers.localImports) addLocalImport(path, i);
        for (const i of resolvers.globalImports) addGlobalImport(path, resolvers.resolveImport(i));
        for (const s of resolvers.stylesheets) addStylesheet(path, s);
        effects.output.write(`${faint("in")} ${(elapsed >= 100 ? yellow : faint)(`${elapsed}ms`)}\n`);
        outputs.set(path, {type: "module", resolvers});
        ++assetCount;
        continue;
      }
    }
    const file = loaders.find(path);
    if (file) {
      effects.output.write(`${faint("copy")} ${join(root, path)} ${faint("→")} `);
      const sourcePath = join(root, await file.load({useStale: true}, effects));
      await effects.copyFile(sourcePath, path);
      ++assetCount;
      continue;
    }
    const page = await loaders.loadPage(path, options, effects);
    if (page.data.draft) {
      effects.logger.log(faint("(skipped)"));
      continue;
    }
    const resolvers = await getResolvers(page, options);
    const elapsed = Math.floor(performance.now() - start);
    for (const f of resolvers.assets) addFile(path, f);
    for (const f of resolvers.files) addFile(path, f);
    for (const i of resolvers.localImports) addLocalImport(path, i);
    for (const i of resolvers.globalImports) addGlobalImport(path, resolvers.resolveImport(i));
    for (const s of resolvers.stylesheets) addStylesheet(path, s);
    effects.output.write(`${faint("in")} ${(elapsed >= 100 ? yellow : faint)(`${elapsed}ms`)}\n`);
    pagePaths.add(path);
    outputs.set(path, {type: "page", page, resolvers});
    ++pageCount;
  }

  // Check that there’s at least one output.
  const outputCount = pageCount + assetCount;
  if (!outputCount) throw new CliError(`Nothing to build: no pages found in your ${root} directory.`);
  if (pageCount) effects.logger.log(`${faint("built")} ${pageCount} ${faint(`page${pageCount === 1 ? "" : "s"} in`)} ${root}`); // prettier-ignore
  if (assetCount) effects.logger.log(`${faint("built")} ${assetCount} ${faint(`asset${assetCount === 1 ? "" : "s"} in`)} ${root}`); // prettier-ignore

  // For cache-breaking we rename most assets to include content hashes.
  const aliases = new Map<string, string>();
  const cacheRoot = join(root, ".observablehq", "cache");

  // Add the search bundle and data, if needed.
  if (config.search) {
    globalImports.add("/_observablehq/search.js").add("/_observablehq/minisearch.json");
    const contents = await searchIndex(config, pagePaths, effects);
    effects.output.write(`${faint("index →")} `);
    const cachePath = join(cacheRoot, "_observablehq", "minisearch.json");
    await prepareOutput(cachePath);
    await writeFile(cachePath, contents);
    effects.logger.log(cachePath);
  }

  // Copy over the DuckDB extensions, initializing aliases that are needed to
  // construct the DuckDB manifest.
  for (const path of globalImports) {
    if (path.startsWith("/_duckdb/")) {
      const sourcePath = join(cacheRoot, path);
      effects.output.write(`${faint("build")} ${path} ${faint("→")} `);
      const contents = await readFile(sourcePath);
      const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
      const [, , , version, bundle, name] = path.split("/");
      const alias = join("/_duckdb/", `${basename(name, ".duckdb_extension.wasm")}-${hash}`, version, bundle, name);
      aliases.set(path, alias);
      await effects.writeFile(alias, contents);
    }
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
      if (path === "/_observablehq/stdlib/duckdb.js") define["DUCKDB_MANIFEST"] = JSON.stringify(await getDuckDBManifest(duckdb, {root, aliases})); // prettier-ignore
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
    effects.output.write(`${faint("copy")} ${join(root, file)} ${faint("→")} `);
    const sourcePath = join(root, await loaders.loadFile(join("/", file), {useStale: true}, effects));
    const contents = await readFile(sourcePath);
    const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
    const alias = applyHash(join("/_file", file), hash);
    aliases.set(loaders.resolveFilePath(file), alias);
    await effects.writeFile(alias, contents);
  }

  // Copy over global assets (e.g., minisearch.json, DuckDB’s WebAssembly).
  // Anything in _observablehq also needs a content hash, but anything in _npm
  // or _node does not (because they are already necessarily immutable). We’re
  // skipping DuckDB’s extensions because they were previously copied above.
  for (const path of globalImports) {
    if (path.endsWith(".js") || path.startsWith("/_duckdb/")) continue;
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
    const resolveImport = (i: string) => isPathImport(i) ? relativePath(path, aliases.get((i = resolvePath(path, i))) ?? i) : i; // prettier-ignore
    await effects.writeFile(aliases.get(path)!, rewriteNpmImports(await readFile(sourcePath, "utf-8"), resolveImport));
  }

  // Copy over imported local modules, overriding import resolution so that
  // module hash is incorporated into the file name rather than in the query
  // string. Note that this hash is not of the content of the module itself, but
  // of the transitive closure of the module and its imports and files.
  const resolveLocalImport = async (path: string): Promise<string> => {
    const hash = (await loaders.getLocalModuleHash(path)).slice(0, 8);
    return applyHash(join("/_import", path), hash);
  };
  for (const path of localImports) {
    if (!path.endsWith(".js")) continue;
    const module = findModule(root, path);
    if (!module) throw new Error(`import not found: ${path}`);
    const sourcePath = join(root, module.path);
    const importPath = join("_import", module.path);
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    const resolveImport = loaders.getModuleResolver(path);
    const input = await readJavaScript(sourcePath);
    const contents = await transpileModule(input, {
      root,
      path,
      params: module.params,
      resolveFile(name) {
        const resolution = loaders.resolveFilePath(resolvePath(path, name));
        return aliases.get(resolution) ?? resolution;
      },
      resolveFileInfo(name) {
        return loaders.getOutputInfo(resolvePath(path, name));
      },
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
    aliases.set(loaders.resolveImportPath(path), alias);
    await effects.writeFile(alias, contents);
  }

  // Wrap the resolvers to apply content-hashed file names.
  for (const [path, output] of outputs) {
    const {resolvers} = output;
    outputs.set(path, {
      ...output,
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
  if (config.title) buildManifest.title = config.title;
  for (const [path, output] of outputs) {
    effects.output.write(`${faint("render")} ${path} ${faint("→")} `);
    if (output.type === "page") {
      const {page, resolvers} = output;
      const html = await renderPage(page, {...config, path, resolvers});
      await effects.writeFile(`${path}.html`, html);
      buildManifest.pages.push({path: config.normalizePath(path), title: page.title});
    } else {
      const {resolvers} = output;
      const source = await renderModule(root, path, resolvers);
      await effects.writeFile(path, source);
    }
  }

  // Write the build manifest.
  await effects.writeBuildManifest(buildManifest);
  // Log page sizes.
  const columnWidth = 12;
  effects.logger.log("");
  for (const [indent, name, description, node] of tree(outputs)) {
    if (node.children) {
      effects.logger.log(
        `${faint(indent)}${name}${faint(description)} ${
          node.depth ? "" : ["Page", "Imports", "Files"].map((name) => name.padStart(columnWidth)).join(" ")
        }`
      );
    } else {
      const [path, {type, resolvers}] = node.data!;
      const resolveOutput = (name: string) => join(config.output, resolvePath(path, name));
      const pageSize = (await stat(join(config.output, type === "page" ? `${path}.html` : path))).size;
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

  // Check links. TODO Have this break the build, and move this check earlier?
  const [validLinks, brokenLinks] = validateLinks(outputs);
  if (brokenLinks.length) {
    effects.logger.warn(`${yellow("Warning: ")}${brokenLinks.length} broken link${brokenLinks.length === 1 ? "" : "s"} (${validLinks.length + brokenLinks.length} validated)`); // prettier-ignore
    for (const [path, link] of brokenLinks) effects.logger.log(`${faint("↳")} ${path} ${faint("→")} ${red(link)}`);
  } else if (validLinks.length) {
    effects.logger.log(`${green(`${validLinks.length}`)} link${validLinks.length === 1 ? "" : "s"} validated`);
  }

  Telemetry.record({event: "build", step: "finish", pageCount});
}

type Link = [path: string, target: string];

function validateLinks(outputs: Map<string, {resolvers: Resolvers}>): [valid: Link[], broken: Link[]] {
  const validTargets = new Set<string>(outputs.keys()); // e.g., "/this/page#hash";
  for (const [path, {resolvers}] of outputs) {
    for (const anchor of resolvers.anchors) {
      validTargets.add(`${path}#${encodeURIComponent(anchor)}`);
    }
  }
  const valid: Link[] = [];
  const broken: Link[] = [];
  for (const [path, {resolvers}] of outputs) {
    for (const target of resolvers.localLinks) {
      (validTargets.has(target) ? valid : broken).push([path, target]);
    }
  }
  return [valid, broken];
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
  async prepare(): Promise<void> {
    if (within(process.cwd(), this.outputRoot)) {
      await rm(this.outputRoot, {recursive: true, force: true});
    } else {
      this.logger.warn(
        `${yellow("Warning:")} the output root ${
          this.outputRoot
        } is not within the current working directory and will not be cleared.`
      );
    }
  }
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    this.logger.log(destination);
    await prepareOutput(destination);
    if (existsSync(destination)) throw new Error(`file conflict: ${outputPath}`);
    await copyFile(sourcePath, destination);
  }
  async writeFile(outputPath: string, contents: string | Buffer): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    this.logger.log(destination);
    await prepareOutput(destination);
    if (existsSync(destination)) throw new Error(`file conflict: ${outputPath}`);
    await writeFile(destination, contents);
  }
  async writeBuildManifest(buildManifest: BuildManifest): Promise<void> {
    const destination = join(this.cacheDir, "_build.json");
    await prepareOutput(destination);
    await writeFile(destination, JSON.stringify(buildManifest));
  }
}

export interface BuildManifest {
  title?: string;
  pages: {path: string; title: string | null}[];
}
