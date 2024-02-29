import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path";
import type {Config} from "./config.js";
import {Loader} from "./dataloader.js";
import {CliError, isEnoent} from "./error.js";
import {getClientPath, prepareOutput, visitMarkdownFiles} from "./files.js";
import {transpileModule} from "./javascript/transpile.js";
import type {Logger, Writer} from "./logger.js";
import type {MarkdownPage} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {populateNpmCache, resolveNpmImport, resolveNpmSpecifier} from "./npm.js";
import {relativePath, resolvePath} from "./path.js";
import {renderPage} from "./render.js";
import type {Resolvers} from "./resolvers.js";
import {getResolvers, resolveFilePath} from "./resolvers.js";
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

  // Add the search bundle and data, if needed.
  if (config.search) {
    globalImports.add("/_observablehq/search.js");
    const outputPath = join("_observablehq", "minisearch.json");
    const code = await searchIndex(config, effects);
    effects.output.write(`${faint("index →")} `);
    await effects.writeFile(outputPath, code);
  }

  // Generate the client bundles (JavaScript and styles).
  //
  // TODO These should have content hashes, too.
  if (addPublic) {
    for (const path of globalImports) {
      if (path.startsWith("/_observablehq/")) {
        const clientPath = getClientPath(`./src/client/${path === "/_observablehq/client.js" ? "index.js" : path.slice("/_observablehq/".length)}`); // prettier-ignore
        effects.output.write(`${faint("build")} ${clientPath} ${faint("→")} `);
        const code = await rollupClient(clientPath, root, path, {minify: true});
        await effects.writeFile(path, code);
      }
    }
    for (const specifier of stylesheets) {
      if (specifier.startsWith("observablehq:")) {
        const path = `/_observablehq/${specifier.slice("observablehq:".length)}`;
        effects.output.write(`${faint("build")} ${specifier} ${faint("→")} `);
        if (specifier.startsWith("observablehq:theme-")) {
          const match = /^observablehq:theme-(?<theme>[\w-]+(,[\w-]+)*)?\.css$/.exec(specifier);
          const code = await bundleStyles({theme: match!.groups!.theme?.split(",") ?? []});
          await effects.writeFile(path, code);
        } else {
          const clientPath = getClientPath(`./src/client/${path.slice("/_observablehq/".length)}`);
          const code = await bundleStyles({path: clientPath});
          await effects.writeFile(`/_observablehq/${specifier.slice("observablehq:".length)}`, code);
        }
      } else if (specifier.startsWith("npm:")) {
        effects.output.write(`${faint("copy")} ${specifier} ${faint("→")} `);
        const path = await resolveNpmImport(root, specifier.slice("npm:".length));
        const sourcePath = await populateNpmCache(root, path); // TODO effects
        await effects.copyFile(sourcePath, path);
      } else if (!/^\w+:/.test(specifier)) {
        const outputPath = join("_import", specifier);
        const sourcePath = join(root, specifier);
        effects.output.write(`${faint("build")} ${sourcePath} ${faint("→")} `);
        const code = await bundleStyles({path: sourcePath});
        await effects.writeFile(outputPath, code);
      }
    }
  }

  // Copy over the referenced files, accumulating hashed aliases.
  const fileAliases = new Map<string, string>();
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
    const ext = extname(file);
    const hash = createHash("sha256").update(contents).digest("hex");
    const alias = `/${join("_file", dirname(file), `${basename(file, ext)}.${hash.slice(0, 8)}${ext}`)}`;
    fileAliases.set(resolveFilePath(root, file), alias);
    await effects.copyFile(sourcePath, alias);
  }

  // Download npm imports.
  //
  // TODO It might be nice to use content hashes for these, too, but it would
  // involve rewriting the files since populateNpmCache doesn’t let you pass in
  // a resolver.
  for (const path of globalImports) {
    if (!path.startsWith("/_npm/")) continue; // skip _observablehq
    effects.output.write(`${faint("copy")} npm:${resolveNpmSpecifier(path)} ${faint("→")} `);
    const sourcePath = await populateNpmCache(root, path); // TODO effects
    await effects.copyFile(sourcePath, path);
  }

  // Copy over imported local modules.
  //
  // TODO We want to override the resolveImport passed to transpileModule so
  // that the module hash is incorporated into the file name rather than in the
  // query string. This hash won’t be “correct” with respect to the generated
  // files, but it will be correct with respect to the transitive closure of
  // module sources so that should be fine (because the hashed file names aren’t
  // baked into the transpiled modules).
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
        resolveFile(specifier: string) {
          const r = resolvers.resolveFile(specifier);
          const a = fileAliases.get(resolvePath(path, r));
          return a ? relativePath(path, a) : specifier; // fallback to specifier if enoent
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
