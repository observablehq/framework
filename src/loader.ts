import {createHash} from "node:crypto";
import type {FSWatcher, WatchListener, WriteStream} from "node:fs";
import {createReadStream, existsSync, statSync, watch} from "node:fs";
import {open, readFile, rename, unlink} from "node:fs/promises";
import {dirname, extname, join} from "node:path/posix";
import {createGunzip} from "node:zlib";
import {spawn} from "cross-spawn";
import JSZip from "jszip";
import {extract} from "tar-stream";
import {enoent} from "./error.js";
import {maybeStat, prepareOutput, visitFiles} from "./files.js";
import {FileWatchers} from "./fileWatchers.js";
import {formatByteSize} from "./format.js";
import type {FileInfo} from "./javascript/module.js";
import {findModule, getFileInfo, getLocalModuleHash, getModuleHash} from "./javascript/module.js";
import type {Logger, Writer} from "./logger.js";
import type {MarkdownPage, ParseOptions} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {getModuleResolver, resolveImportPath} from "./resolvers.js";
import type {Params} from "./route.js";
import {isParameterized, requote, route} from "./route.js";
import {cyan, faint, green, red, yellow} from "./tty.js";

const runningCommands = new Map<string, Promise<string>>();

export const defaultInterpreters: Record<string, string[]> = {
  ".js": ["node", "--no-warnings=ExperimentalWarning"],
  ".ts": ["tsx"],
  ".py": ["python3"],
  ".r": ["Rscript"],
  ".R": ["Rscript"],
  ".rs": ["rust-script"],
  ".go": ["go", "run"],
  ".java": ["java"],
  ".jl": ["julia"],
  ".php": ["php"],
  ".sh": ["sh"],
  ".exe": []
};

export interface LoadEffects {
  logger: Logger;
  output: Writer;
}

const defaultEffects: LoadEffects = {
  logger: console,
  output: process.stdout
};

export interface LoadOptions {
  /** Whether to use a stale cache; true when building. */
  useStale?: boolean;
}

export interface LoaderOptions {
  root: string;
  path: string;
  params?: Params;
  targetPath: string;
}

export class LoaderResolver {
  private readonly root: string;
  private readonly interpreters: Map<string, string[]>;

  constructor({root, interpreters}: {root: string; interpreters?: Record<string, string[] | null>}) {
    this.root = root;
    this.interpreters = new Map(
      Object.entries({...defaultInterpreters, ...interpreters}).filter(
        (entry): entry is [string, string[]] => entry[1] != null
      )
    );
  }

  /**
   * Loads the file at the specified path, returning a promise to the path to
   * the (possibly generated) file relative to the source root.
   */
  async loadFile(path: string, options?: LoadOptions, effects?: LoadEffects): Promise<string> {
    const loader = this.find(path);
    if (!loader) throw enoent(path);
    return await loader.load(options, effects);
  }

  /**
   * Loads the page at the specified path, returning a promise to the parsed
   * page object.
   */
  async loadPage(path: string, options: LoadOptions & ParseOptions, effects?: LoadEffects): Promise<MarkdownPage> {
    const loader = this.findPage(path);
    if (!loader) throw enoent(path);
    const source = await readFile(join(this.root, await loader.load(options, effects)), "utf8");
    return parseMarkdown(source, {params: loader.params, ...options});
  }

  /**
   * Returns a watcher for the page at the specified path.
   */
  watchPage(path: string, listener: WatchListener<string>): FSWatcher {
    const loader = this.findPage(path);
    if (!loader) throw enoent(path);
    return watch(join(this.root, loader.path), listener);
  }

  /**
   * Finds the paths of all non-parameterized pages within the source root.
   */
  *findPagePaths(): Generator<string> {
    const ext = new RegExp(`\\.md(${["", ...this.interpreters.keys()].map(requote).join("|")})$`);
    for (const file of visitFiles(this.root, (name) => !isParameterized(name))) {
      if (!ext.test(file)) continue;
      const path = `/${file.slice(0, file.lastIndexOf(".md"))}`;
      if (extname(path) === ".js" && findModule(this.root, path)) continue;
      yield path;
    }
  }

  /**
   * Finds the page loader for the specified target path, relative to the source
   * root, if the loader exists. If there is no such loader, returns undefined.
   */
  findPage(path: string): Loader | undefined {
    if (extname(path) === ".js" && findModule(this.root, path)) return;
    return this.find(`${path}.md`);
  }

  /**
   * Finds the loader for the specified target path, relative to the source
   * root, if the loader exists. If there is no such loader, returns undefined.
   * For files within archives, we find the first parent folder that exists, but
   * abort if we find a matching folder or reach the source root; for example,
   * if src/data exists, we won’t look for a src/data.zip.
   */
  find(path: string): Loader | undefined {
    return this.findFile(path) ?? this.findArchive(path);
  }

  // Finding a file:
  // - /path/to/file.csv
  // - /path/to/file.csv.js
  // - /path/to/[param].csv
  // - /path/to/[param].csv.js
  // - /path/[param]/file.csv
  // - /path/[param]/file.csv.js
  // - /path/[param1]/[param2].csv
  // - /path/[param1]/[param2].csv.js
  // - /[param]/to/file.csv
  // - /[param]/to/file.csv.js
  // - /[param1]/to/[param2].csv
  // - /[param1]/to/[param2].csv.js
  // - /[param1]/[param2]/file.csv
  // - /[param1]/[param2]/file.csv.js
  // - /[param1]/[param2]/[param3].csv
  // - /[param1]/[param2]/[param3].csv.js
  private findFile(targetPath: string): Loader | undefined {
    const ext = extname(targetPath);
    const exts = ext ? [ext, ...Array.from(this.interpreters.keys(), (iext) => ext + iext)] : [ext];
    const found = route(this.root, ext ? targetPath.slice(0, -ext.length) : targetPath, exts);
    if (!found) return;
    const {path, params, ext: fext} = found;
    if (fext === ext) return new StaticLoader({root: this.root, path, params});
    const commandPath = join(this.root, path);
    const [command, ...args] = this.interpreters.get(fext.slice(ext.length))!;
    if (command != null) args.push(commandPath);
    return new CommandLoader({
      command: command ?? commandPath,
      args: params ? args.concat(defineParams(params)) : args,
      path,
      params,
      root: this.root,
      targetPath
    });
  }

  // Finding a file in an archive:
  // - /path/to.zip
  // - /path/to.tgz
  // - /path/to.zip.js
  // - /path/to.tgz.js
  // - /path/[param].zip
  // - /path/[param].tgz
  // - /path/[param].zip.js
  // - /path/[param].tgz.js
  // - /[param]/to.zip
  // - /[param]/to.tgz
  // - /[param]/to.zip.js
  // - /[param]/to.tgz.js
  // - /[param1]/[param2].zip
  // - /[param1]/[param2].tgz
  // - /[param1]/[param2].zip.js
  // - /[param1]/[param2].tgz.js
  // - /path.zip
  // - /path.tgz
  // - /path.zip.js
  // - /path.tgz.js
  // - /[param].zip
  // - /[param].tgz
  // - /[param].zip.js
  // - /[param].tgz.js
  private findArchive(targetPath: string): Loader | undefined {
    const exts = this.getArchiveExtensions();
    for (let dir = dirname(targetPath), parent: string; (parent = dirname(dir)) !== dir; dir = parent) {
      const found = route(this.root, dir, exts);
      if (!found) continue;
      const {path, params, ext: fext} = found;
      const inflatePath = targetPath.slice(dir.length + 1); // file.jpeg
      if (extractors.has(fext)) {
        const Extractor = extractors.get(fext)!;
        return new Extractor({
          preload: async () => path, // /path/to.zip
          inflatePath,
          path,
          params,
          root: this.root,
          targetPath // /path/to/file.jpg
        });
      }
      const iext = extname(fext);
      const commandPath = join(this.root, path);
      const [command, ...args] = this.interpreters.get(iext)!;
      if (command != null) args.push(commandPath);
      const eext = fext.slice(0, -iext.length); // .zip
      const loader = new CommandLoader({
        command: command ?? commandPath,
        args: params ? args.concat(defineParams(params)) : args,
        path,
        params,
        root: this.root,
        targetPath: dir + eext // /path/to.zip
      });
      const Extractor = extractors.get(eext)!;
      return new Extractor({
        preload: async (options, effects) => loader.load(options, effects), // /path/to.zip.js
        inflatePath,
        path: loader.path,
        params,
        root: this.root,
        targetPath
      });
    }
  }

  // .zip, .tar, .tgz, .zip.js, .zip.py, etc.
  getArchiveExtensions(): string[] {
    const exts = Array.from(extractors.keys());
    for (const e of extractors.keys()) for (const i of this.interpreters.keys()) exts.push(e + i);
    return exts;
  }

  /**
   * Returns the path to watch, relative to the current working directory, for
   * the specified source path, relative to the source root.
   */
  getWatchPath(path: string): string | undefined {
    const exactPath = join(this.root, path);
    if (existsSync(exactPath)) return exactPath;
    if (exactPath.endsWith(".js")) {
      const module = findModule(this.root, path);
      return module && join(this.root, module.path);
    }
    const foundPath = this.find(path)?.path;
    if (foundPath) return join(this.root, foundPath);
  }

  watchFiles(path: string, watchPaths: Iterable<string>, callback: (name: string) => void) {
    return FileWatchers.of(this, path, watchPaths, callback);
  }

  /**
   * Returns the path to the backing file during preview, relative to the source
   * root, which is the source file for the associated data loader if the file
   * is generated by a loader.
   */
  private getSourceFilePath(path: string): string {
    if (!existsSync(join(this.root, path))) {
      const loader = this.find(path);
      if (loader) return loader.path;
    }
    return path;
  }

  /**
   * Returns the path to the backing file during build, relative to the source
   * root, which is the cached output file if the file is generated by a loader.
   */
  private getOutputFilePath(path: string): string {
    if (!existsSync(join(this.root, path))) {
      const loader = this.find(path);
      if (loader) return join(".observablehq", "cache", path);
    }
    return path;
  }

  /**
   * Returns the hash of the file with the given name within the source root, or
   * if the name refers to a file generated by a data loader, the hash of the
   * corresponding data loader source and its modification time. The latter
   * ensures that if the data loader is “touched” (even without changing its
   * contents) that the data loader will be re-run.
   */
  getSourceFileHash(name: string): string {
    const path = this.getSourceFilePath(name);
    const info = getFileInfo(this.root, path);
    if (!info) return createHash("sha256").digest("hex");
    const {hash} = info;
    return path === name ? hash : createHash("sha256").update(hash).update(String(info.mtimeMs)).digest("hex");
  }

  getOutputFileHash(name: string): string {
    const info = this.getOutputInfo(name);
    if (!info) throw new Error(`output file not found: ${name}`);
    return info.hash;
  }

  getSourceInfo(name: string): FileInfo | undefined {
    return getFileInfo(this.root, this.getSourceFilePath(name));
  }

  getOutputInfo(name: string): FileInfo | undefined {
    return getFileInfo(this.root, this.getOutputFilePath(name));
  }

  getLocalModuleHash(path: string): Promise<string> {
    return getLocalModuleHash(this.root, path, (p) => this.getOutputFileHash(p));
  }

  getModuleHash(path: string): string {
    return getModuleHash(this.root, path, (p) => this.getSourceFileHash(p));
  }

  getModuleResolver(path: string, servePath?: string): (specifier: string) => Promise<string> {
    return getModuleResolver(this.root, path, servePath, (p) => this.getSourceFileHash(p));
  }

  resolveImportPath(path: string): string {
    return resolveImportPath(this.root, path, (p) => this.getSourceFileHash(p));
  }

  resolveFilePath(path: string): string {
    return `/${join("_file", path)}?sha=${this.getSourceFileHash(path)}`;
  }
}

function defineParams(params: Params): string[] {
  return Object.entries(params)
    .filter(([name]) => /^[a-z0-9_]+$/i.test(name)) // ignore non-ASCII parameters
    .map(([name, value]) => `--${name}=${value}`);
}

export interface Loader {
  /**
   * The source root relative to the current working directory, such as src.
   */
  readonly root: string;

  /**
   * The path to the loader script or executable relative to the source root.
   * This is exposed so that clients can check which file to watch to see if the
   * loader is edited (and in which case it needs to be re-run).
   */
  readonly path: string;

  /** TODO */
  readonly params: Params | undefined;

  /**
   * Runs this loader, returning the path to the generated output file relative
   * to the source root; this is typically within the .observablehq/cache folder
   * within the source root.
   */
  load(options?: LoadOptions, effects?: LoadEffects): Promise<string>;
}

/** Used by LoaderResolver.find to represent a static file resolution. */
class StaticLoader implements Loader {
  readonly root: string;
  readonly path: string;
  readonly params: Params | undefined;

  constructor({root, path, params}: Omit<LoaderOptions, "targetPath">) {
    this.root = root;
    this.path = path;
    this.params = params;
  }

  async load() {
    return this.path;
  }
}

abstract class AbstractLoader implements Loader {
  readonly root: string;
  readonly path: string;
  readonly params: Params | undefined;

  /**
   * The path to the loader script’s output relative to the destination root.
   * This is where the loader’s output is served, but the loader generates the
   * file in the .observablehq/cache directory within the source root.
   */
  readonly targetPath: string;

  constructor({root, path, params, targetPath}: LoaderOptions) {
    this.root = root;
    this.path = path;
    this.params = params;
    this.targetPath = targetPath;
  }

  async load({useStale = false}: LoadOptions = {}, effects = defaultEffects): Promise<string> {
    const loaderPath = join(this.root, this.path);
    const key = join(this.root, this.targetPath);
    let command = runningCommands.get(key);
    if (!command) {
      command = (async () => {
        const outputPath = join(".observablehq", "cache", this.targetPath);
        const cachePath = join(this.root, outputPath);
        const loaderStat = await maybeStat(loaderPath);
        const cacheStat = await maybeStat(cachePath);
        if (!cacheStat) effects.output.write(faint("[missing] "));
        else if (cacheStat.mtimeMs < loaderStat!.mtimeMs) {
          if (useStale) return effects.output.write(faint("[using stale] ")), outputPath;
          else effects.output.write(faint("[stale] "));
        } else return effects.output.write(faint("[fresh] ")), outputPath;
        const tempPath = join(this.root, ".observablehq", "cache", `${this.targetPath}.${process.pid}`);
        const errorPath = tempPath + ".err";
        const errorStat = await maybeStat(errorPath);
        if (errorStat) {
          if (errorStat.mtimeMs > loaderStat!.mtimeMs && errorStat.mtimeMs > -1000 + Date.now())
            throw new Error("loader skipped due to recent error");
          else await unlink(errorPath).catch(() => {});
        }
        await prepareOutput(tempPath);
        await prepareOutput(cachePath);
        const tempFd = await open(tempPath, "w");
        try {
          await this.exec(tempFd.createWriteStream({highWaterMark: 1024 * 1024}), {useStale}, effects);
          await rename(tempPath, cachePath);
        } catch (error) {
          await rename(tempPath, errorPath);
          throw error;
        } finally {
          await tempFd.close();
        }
        return outputPath;
      })();
      command.finally(() => runningCommands.delete(key)).catch(() => {});
      runningCommands.set(key, command);
    }
    effects.output.write(`${cyan("load")} ${this.targetPath} ${faint("→")} `);
    const start = performance.now();
    command.then(
      (path) => {
        const {size} = statSync(join(this.root, path));
        effects.logger.log(
          `${green("success")} ${size ? cyan(formatByteSize(size)) : yellow("empty output")} ${faint(
            `in ${formatElapsed(start)}`
          )}`
        );
      },
      (error) => {
        effects.logger.log(`${red("error")} ${faint(`in ${formatElapsed(start)}:`)} ${red(error.message)}`);
      }
    );
    return command;
  }

  abstract exec(output: WriteStream, options?: LoadOptions, effects?: LoadEffects): Promise<void>;
}

interface CommandLoaderOptions extends LoaderOptions {
  command: string;
  args: string[];
}

class CommandLoader extends AbstractLoader {
  /**
   * The command to run, such as "node" for a JavaScript loader, "tsx" for
   * TypeScript, and "sh" for a shell script. "noop" when we only need to
   * inflate a file from a static archive.
   */
  private readonly command: string;

  /**
   * Args to pass to the command; currently this is a single argument of the
   * path to the loader script relative to the current working directory. (TODO
   * Support passing additional arguments to loaders.)
   */
  private readonly args: string[];

  constructor({command, args, ...options}: CommandLoaderOptions) {
    super(options);
    this.command = command;
    this.args = args;
  }

  async exec(output: WriteStream): Promise<void> {
    const subprocess = spawn(this.command, this.args, {windowsHide: true, stdio: ["ignore", output, "inherit"]});
    const code = await new Promise((resolve, reject) => {
      subprocess.on("error", reject);
      subprocess.on("close", resolve);
    });
    if (code !== 0) {
      throw new Error(`loader exited with code ${code}`);
    }
  }
}

interface ExtractorOptions extends LoaderOptions {
  preload: Loader["load"];
  inflatePath: string;
}

class ZipExtractor extends AbstractLoader {
  private readonly preload: Loader["load"];
  private readonly inflatePath: string;

  constructor({preload, inflatePath, ...options}: ExtractorOptions) {
    super(options);
    this.preload = preload;
    this.inflatePath = inflatePath;
  }

  async exec(output: WriteStream, options?: LoadOptions, effects?: LoadEffects): Promise<void> {
    const archivePath = join(this.root, await this.preload(options, effects));
    const file = (await JSZip.loadAsync(await readFile(archivePath))).file(this.inflatePath);
    if (!file) throw enoent(this.inflatePath);
    const pipe = file.nodeStream().pipe(output);
    await new Promise((resolve, reject) => pipe.on("error", reject).on("finish", resolve));
  }
}

interface TarExtractorOptions extends ExtractorOptions {
  gunzip?: boolean;
}

class TarExtractor extends AbstractLoader {
  private readonly preload: Loader["load"];
  private readonly inflatePath: string;
  private readonly gunzip: boolean;

  constructor({preload, inflatePath, gunzip = false, ...options}: TarExtractorOptions) {
    super(options);
    this.preload = preload;
    this.inflatePath = inflatePath;
    this.gunzip = gunzip;
  }

  async exec(output: WriteStream, options?: LoadOptions, effects?: LoadEffects): Promise<void> {
    const archivePath = join(this.root, await this.preload(options, effects));
    const tar = extract();
    const input = createReadStream(archivePath);
    (this.gunzip ? input.pipe(createGunzip()) : input).pipe(tar);
    for await (const entry of tar) {
      if (entry.header.name === this.inflatePath) {
        const pipe = entry.pipe(output);
        await new Promise((resolve, reject) => pipe.on("error", reject).on("finish", resolve));
        return;
      } else {
        entry.resume();
      }
    }
    throw enoent(this.inflatePath);
  }
}

class TarGzExtractor extends TarExtractor {
  constructor(options: TarExtractorOptions) {
    super({...options, gunzip: true});
  }
}

const extractors = new Map<string, new (options: ExtractorOptions) => Loader>([
  [".zip", ZipExtractor],
  [".tar", TarExtractor],
  [".tar.gz", TarGzExtractor],
  [".tgz", TarGzExtractor]
]);

function formatElapsed(start: number): string {
  const elapsed = performance.now() - start;
  return `${Math.floor(elapsed)}ms`;
}
