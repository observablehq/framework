import {type WriteStream, createReadStream, existsSync, statSync} from "node:fs";
import {mkdir, open, readFile, rename, unlink} from "node:fs/promises";
import {dirname, extname, join} from "node:path/posix";
import {createGunzip} from "node:zlib";
import {spawn} from "cross-spawn";
import JSZip from "jszip";
import {extract} from "tar-stream";
import {maybeStat, prepareOutput} from "./files.js";
import type {Logger, Writer} from "./logger.js";
import {cyan, faint, green, red, yellow} from "./tty.js";

const runningCommands = new Map<string, Promise<string>>();

const languages = {
  ".js": ["node", "--no-warnings=ExperimentalWarning"],
  ".ts": ["tsx"],
  ".py": ["python3"],
  ".r": ["Rscript"],
  ".R": ["Rscript"],
  ".rs": ["rust-script"],
  ".go": ["go", "run"],
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

export interface LoaderOptions {
  path: string;
  sourceRoot: string;
  targetPath: string;
  useStale: boolean;
}

export abstract class Loader {
  /**
   * The path to the loader script or executable relative to the current working
   * directory. This is exposed so that clients can check which file to watch to
   * see if the loader is edited (and in which case it needs to be re-run).
   */
  readonly path: string;

  /**
   * The source root relative to the current working directory, such as docs.
   */
  readonly sourceRoot: string;

  /**
   * The path to the loader script’s output relative to the destination root.
   * This is where the loader’s output is served, but the loader generates the
   * file in the .observablehq/cache directory within the source root.
   */
  readonly targetPath: string;

  /**
   * Should the loader use a stale cache. true when building.
   */
  readonly useStale?: boolean;

  constructor({path, sourceRoot, targetPath, useStale}: LoaderOptions) {
    this.path = path;
    this.sourceRoot = sourceRoot;
    this.targetPath = targetPath;
    this.useStale = useStale;
  }

  /**
   * Finds the loader for the specified target path, relative to the specified
   * source root, if it exists. If there is no such loader, returns undefined.
   * For files within archives, we find the first parent folder that exists, but
   * abort if we find a matching folder or reach the source root; for example,
   * if docs/data exists, we won’t look for a docs/data.zip.
   */
  static find(sourceRoot: string, targetPath: string, {useStale = false} = {}): Loader | undefined {
    const exact = this.findExact(sourceRoot, targetPath, {useStale});
    if (exact) return exact;
    let dir = dirname(targetPath);
    for (let parent: string; true; dir = parent) {
      parent = dirname(dir);
      if (parent === dir) return; // reached source root
      if (existsSync(join(sourceRoot, dir))) return; // found folder
      if (existsSync(join(sourceRoot, parent))) break; // found parent
    }
    for (const [ext, Extractor] of extractors) {
      const archive = dir + ext;
      if (existsSync(join(sourceRoot, archive))) {
        return new Extractor({
          preload: async () => archive,
          inflatePath: targetPath.slice(archive.length - ext.length + 1),
          path: join(sourceRoot, archive),
          sourceRoot,
          targetPath,
          useStale
        });
      }
      const archiveLoader = this.findExact(sourceRoot, archive, {useStale});
      if (archiveLoader) {
        return new Extractor({
          preload: async (options) => archiveLoader.load(options),
          inflatePath: targetPath.slice(archive.length - ext.length + 1),
          path: archiveLoader.path,
          sourceRoot,
          targetPath,
          useStale
        });
      }
    }
  }

  private static findExact(sourceRoot: string, targetPath: string, {useStale}): Loader | undefined {
    for (const [ext, [command, ...args]] of Object.entries(languages)) {
      if (!existsSync(join(sourceRoot, targetPath + ext))) continue;
      if (extname(targetPath) === "") {
        console.warn(`invalid data loader path: ${targetPath + ext}`);
        return;
      }
      const path = join(sourceRoot, targetPath + ext);
      return new CommandLoader({
        command: command ?? path,
        args: command == null ? args : [...args, path],
        path,
        sourceRoot,
        targetPath,
        useStale
      });
    }
  }

  /**
   * Runs this loader, returning the path to the generated output file relative
   * to the source root; this is within the .observablehq/cache folder within
   * the source root.
   */
  async load(effects = defaultEffects): Promise<string> {
    const key = join(this.sourceRoot, this.targetPath);
    let command = runningCommands.get(key);
    if (!command) {
      command = (async () => {
        const outputPath = join(".observablehq", "cache", this.targetPath);
        const cachePath = join(this.sourceRoot, outputPath);
        const loaderStat = await maybeStat(this.path);
        const cacheStat = await maybeStat(cachePath);
        if (!cacheStat) effects.output.write(faint("[missing] "));
        else if (cacheStat.mtimeMs < loaderStat!.mtimeMs) {
          if (this.useStale) return effects.output.write(faint("[using stale] ")), outputPath;
          else effects.output.write(faint("[stale] "));
        } else return effects.output.write(faint("[fresh] ")), outputPath;
        const tempPath = join(this.sourceRoot, ".observablehq", "cache", `${this.targetPath}.${process.pid}`);
        const errorPath = tempPath + ".err";
        const errorStat = await maybeStat(errorPath);
        if (errorStat) {
          if (errorStat.mtimeMs > loaderStat!.mtimeMs && errorStat.mtimeMs > -1000 + Date.now())
            throw new Error("loader skipped due to recent error");
          else await unlink(errorPath).catch(() => {});
        }
        await prepareOutput(tempPath);
        const tempFd = await open(tempPath, "w");
        try {
          await this.exec(tempFd.createWriteStream({highWaterMark: 1024 * 1024}), effects);
          await mkdir(dirname(cachePath), {recursive: true});
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
    effects.output.write(`${cyan("load")} ${this.path} ${faint("→")} `);
    const start = performance.now();
    command.then(
      (path) => {
        effects.logger.log(
          `${green("success")} ${cyan(formatSize(statSync(join(this.sourceRoot, path)).size))} ${faint(
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

  abstract exec(output: WriteStream, effects?: LoadEffects): Promise<void>;
}

interface CommandLoaderOptions extends LoaderOptions {
  command: string;
  args: string[];
}

class CommandLoader extends Loader {
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
    const subprocess = spawn(this.command, this.args, {windowsHide: true, stdio: ["ignore", "pipe", "inherit"]});
    subprocess.stdout.pipe(output);
    const code = await new Promise((resolve, reject) => {
      subprocess.on("error", reject);
      subprocess.on("close", resolve);
    });
    if (code !== 0) {
      throw new Error(`loader exited with code ${code}`);
    }
  }
}

interface ZipExtractorOptions extends LoaderOptions {
  preload: Loader["load"];
  inflatePath: string;
}

class ZipExtractor extends Loader {
  private readonly preload: Loader["load"];
  private readonly inflatePath: string;

  constructor({preload, inflatePath, ...options}: ZipExtractorOptions) {
    super(options);
    this.preload = preload;
    this.inflatePath = inflatePath;
  }

  async exec(output: WriteStream, effects?: LoadEffects): Promise<void> {
    const archivePath = join(this.sourceRoot, await this.preload(effects));
    const file = (await JSZip.loadAsync(await readFile(archivePath))).file(this.inflatePath);
    if (!file) throw Object.assign(new Error("file not found"), {code: "ENOENT"});
    const pipe = file.nodeStream().pipe(output);
    await new Promise((resolve, reject) => pipe.on("error", reject).on("finish", resolve));
  }
}

interface TarExtractorOptions extends LoaderOptions {
  preload: Loader["load"];
  inflatePath: string;
  gunzip?: boolean;
}

class TarExtractor extends Loader {
  private readonly preload: Loader["load"];
  private readonly inflatePath: string;
  private readonly gunzip: boolean;

  constructor({preload, inflatePath, gunzip = false, ...options}: TarExtractorOptions) {
    super(options);
    this.preload = preload;
    this.inflatePath = inflatePath;
    this.gunzip = gunzip;
  }

  async exec(output: WriteStream, effects?: LoadEffects): Promise<void> {
    const archivePath = join(this.sourceRoot, await this.preload(effects));
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
    throw Object.assign(new Error("file not found"), {code: "ENOENT"});
  }
}

class TarGzExtractor extends TarExtractor {
  constructor(options: TarExtractorOptions) {
    super({...options, gunzip: true});
  }
}

const extractors = [
  [".zip", ZipExtractor],
  [".tar", TarExtractor],
  [".tar.gz", TarGzExtractor],
  [".tgz", TarGzExtractor]
] as const;

function formatSize(size: number): string {
  if (!size) return yellow("empty output");
  const e = Math.floor(Math.log(size) / Math.log(1024));
  return `${+(size / 1024 ** e).toFixed(2)} ${["bytes", "KiB", "MiB", "GiB", "TiB"][e]}`;
}

function formatElapsed(start: number): string {
  const elapsed = performance.now() - start;
  return `${Math.floor(elapsed)}ms`;
}
