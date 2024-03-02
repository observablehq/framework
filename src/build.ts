import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path/posix";
import type {Config} from "./config.js";
import {Loader} from "./dataloader.js";
import {CliError, isEnoent} from "./error.js";
import {getClientPath, prepareOutput, visitMarkdownFiles} from "./files.js";
import {getModuleHash} from "./javascript/module.js";
import {transpileModule} from "./javascript/transpile.js";
import type {Logger, Writer} from "./logger.js";
import type {MarkdownPage} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {populateNpmCache, resolveNpmImport, resolveNpmSpecifier} from "./npm.js";
import {isPathImport, relativePath, resolvePath} from "./path.js";
import {renderPage} from "./render.js";
import type {Resolvers} from "./resolvers.js";
import {getModuleResolver, getResolvers} from "./resolvers.js";
import {resolveFilePath, resolveImportPath, resolveStylesheetPath} from "./resolvers.js";
import {bundleStyles, rollupClient} from "./rollup.js";
import {searchIndex} from "./search.js";
import {Telemetry} from "./telemetry.js";
import {faint, yellow} from "./tty.js";

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
  Telemetry.record({event: "build", step: "start"});

  // Make sure all files are readable before starting to write output files.
  let pageCount = 0;
  for await (const sourceFile of visitMarkdownFiles(root)) {
    await access(join(root, sourceFile), constants.R_OK);
    pageCount++;
  }
  if (!pageCount) throw new CliError(`Nothing to build: no page files found in your ${root} directory.`);
  effects.logger.log(`${faint("found")} ${pageCount} ${faint(`page${pageCount === 1 ? "" : "s"} in`)} ${root}`);

  // Parse .md files, building a list of additional assets as we go.
  const pages = new Map<string, {page: MarkdownPage; resolvers: Resolvers}>();
  const files = new Set<string>();
  const localImports = new Set<string>();
  const globalImports = new Set<string>();
  const stylesheets = new Set<string>();
  for await (const sourceFile of visitMarkdownFiles(root)) {
    const sourcePath = join(root, sourceFile);
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const options = {path, ...config};
    effects.output.write(`${faint("parse")} ${sourcePath} `);
    const start = performance.now();
    const page = await parseMarkdown(sourcePath, options);
    if (page?.data?.draft) {
      effects.logger.log(faint("(skipped)"));
      continue;
    }
    const resolvers = await getResolvers(page, {root, path: sourceFile});
    const elapsed = Math.floor(performance.now() - start);
    for (const f of resolvers.assets) files.add(resolvePath(sourceFile, f));
    for (const f of resolvers.files) files.add(resolvePath(sourceFile, f));
    for (const i of resolvers.localImports) localImports.add(resolvePath(sourceFile, i));
    for (const i of resolvers.globalImports) globalImports.add(resolvePath(sourceFile, resolvers.resolveImport(i)));
    for (const s of resolvers.stylesheets) stylesheets.add(/^\w+:/.test(s) ? s : resolvePath(sourceFile, s));
    effects.output.write(`${faint("in")} ${(elapsed >= 100 ? yellow : faint)(`${elapsed}ms`)}\n`);
    pages.set(sourceFile, {page, resolvers});
  }

  // For cache-breaking we rename most assets to include content hashes.
  const aliases = new Map<string, string>();

  // Add the search bundle and data, if needed.
  if (config.search) {
    globalImports.add("/_observablehq/search.js");
    const contents = await searchIndex(config, effects);
    effects.output.write(`${faint("index →")} `);
    const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
    const alias = `/_observablehq/minisearch.${hash}.json`;
    aliases.set("/_observablehq/minisearch.json", alias);
    await effects.writeFile(join("_observablehq", `minisearch.${hash}.json`), contents);
  }

  // Generate the client bundles (JavaScript and styles). TODO Use a content
  // hash, or perhaps the Framework version number for built-in modules.
  if (addPublic) {
    for (const path of globalImports) {
      if (path.startsWith("/_observablehq/") && path.endsWith(".js")) {
        const clientPath = getClientPath(`./src/client/${path === "/_observablehq/client.js" ? "index.js" : path.slice("/_observablehq/".length)}`); // prettier-ignore
        effects.output.write(`${faint("build")} ${clientPath} ${faint("→")} `);
        const define: {[key: string]: string} = {};
        if (config.search) define["global.__minisearch"] = JSON.stringify(relativePath(path, aliases.get("/_observablehq/minisearch.json")!)); // prettier-ignore
        const contents = await rollupClient(clientPath, root, path, {minify: true, define});
        await effects.writeFile(path, contents);
      }
    }
    for (const specifier of stylesheets) {
      if (specifier.startsWith("observablehq:")) {
        const path = `/_observablehq/${specifier.slice("observablehq:".length)}`;
        effects.output.write(`${faint("build")} ${specifier} ${faint("→")} `);
        if (specifier.startsWith("observablehq:theme-")) {
          const match = /^observablehq:theme-(?<theme>[\w-]+(,[\w-]+)*)?\.css$/.exec(specifier);
          const contents = await bundleStyles({theme: match!.groups!.theme?.split(",") ?? []});
          await effects.writeFile(path, contents);
        } else {
          const clientPath = getClientPath(`./src/client/${path.slice("/_observablehq/".length)}`);
          const contents = await bundleStyles({path: clientPath});
          await effects.writeFile(`/_observablehq/${specifier.slice("observablehq:".length)}`, contents);
        }
      } else if (specifier.startsWith("npm:")) {
        effects.output.write(`${faint("copy")} ${specifier} ${faint("→")} `);
        const path = await resolveNpmImport(root, specifier.slice("npm:".length));
        const sourcePath = await populateNpmCache(root, path); // TODO effects
        await effects.copyFile(sourcePath, path);
      } else if (!/^\w+:/.test(specifier)) {
        const sourcePath = join(root, specifier);
        effects.output.write(`${faint("build")} ${sourcePath} ${faint("→")} `);
        const contents = await bundleStyles({path: sourcePath});
        const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
        const ext = extname(specifier);
        const alias = `/${join("_import", dirname(specifier), `${basename(specifier, ext)}.${hash}${ext}`)}`;
        aliases.set(resolveStylesheetPath(root, specifier), alias);
        await effects.writeFile(alias, contents);
      }
    }
  }

  // Copy over the referenced files, accumulating hashed aliases.
  for (const file of files) {
    let sourcePath = join(root, file);
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
    const contents = await readFile(sourcePath);
    const hash = createHash("sha256").update(contents).digest("hex").slice(0, 8);
    const ext = extname(file);
    const alias = `/${join("_file", dirname(file), `${basename(file, ext)}.${hash}${ext}`)}`;
    aliases.set(resolveFilePath(root, file), alias);
    await effects.writeFile(alias, contents);
  }

  // Download npm imports. TODO It might be nice to use content hashes for
  // these, too, but it would involve rewriting the files since populateNpmCache
  // doesn’t let you pass in a resolver.
  for (const path of globalImports) {
    if (!path.startsWith("/_npm/")) continue; // skip _observablehq
    effects.output.write(`${faint("copy")} npm:${resolveNpmSpecifier(path)} ${faint("→")} `);
    const sourcePath = await populateNpmCache(root, path); // TODO effects
    await effects.copyFile(sourcePath, path);
  }

  // Copy over imported local modules, overriding import resolution so that
  // module hash is incorporated into the file name rather than in the query
  // string. Note that this hash is not of the content of the module itself, but
  // of the transitive closure of the module and its imports and files.
  const resolveImportAlias = (path: string): string => {
    const hash = getModuleHash(root, path).slice(0, 8);
    const ext = extname(path);
    return `/${join("_import", dirname(path), basename(path, ext))}.${hash}${ext}`;
  };
  for (const path of localImports) {
    const sourcePath = join(root, path);
    if (!existsSync(sourcePath)) {
      effects.logger.error("missing referenced file", sourcePath);
      continue;
    }
    effects.output.write(`${faint("copy")} ${sourcePath} ${faint("→")} `);
    const resolveImport = getModuleResolver(root, path);
    const input = await readFile(sourcePath, "utf-8");
    const contents = await transpileModule(input, {
      root,
      path,
      async resolveImport(specifier) {
        return isPathImport(specifier)
          ? relativePath(join("_import", path), resolveImportAlias(resolvePath(path, specifier)))
          : resolveImport(specifier);
      }
    });
    const alias = resolveImportAlias(path);
    aliases.set(resolveImportPath(root, path), alias);
    await effects.writeFile(alias, contents);
  }

  // Render pages, resolving against content-hashed file names!
  for (const [sourceFile, {page, resolvers}] of pages) {
    const sourcePath = join(root, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const options = {path, ...config};
    effects.output.write(`${faint("render")} ${sourcePath} ${faint("→")} `);
    const html = await renderPage(page, {
      ...options,
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
        }
      }
    });
    await effects.writeFile(outputPath, html);
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
