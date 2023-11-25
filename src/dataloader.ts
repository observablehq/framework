import {spawn} from "node:child_process";
import {type WriteStream, existsSync, statSync} from "node:fs";
import {mkdir, open, readFile, rename, unlink} from "node:fs/promises";
import {dirname, extname, join} from "node:path";
import JSZip from "jszip";
import {maybeStat, prepareOutput} from "./files.js";

const runningCommands = new Map<string, Promise<string>>();

const languages = {
  ".js": "node",
  ".ts": "tsx",
  ".py": "python3",
  ".r": "Rscript",
  ".R": "Rscript",
  ".sh": "sh",
  ".exe": null
};

export interface LoadOptions {
  verbose?: boolean;
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

  constructor({path, sourceRoot, targetPath}) {
    this.path = path;
    this.sourceRoot = sourceRoot;
    this.targetPath = targetPath;
  }

  /**
   * Finds the loader for the specified target path, relative to the specified
   * source root, if it exists. If there is no such loader, returns undefined.
   */
  static find(sourceRoot: string, targetPath: string): Loader | undefined {
    const exact = this.findExact(sourceRoot, targetPath);
    if (exact) return exact;
    let dir = targetPath;
    while ("/" !== (dir = dirname(dir))) {
      const archive = dir + ".zip";
      if (existsSync(join(sourceRoot, archive))) {
        return new Extractor({
          preload: async () => archive,
          inflatePath: targetPath.slice(archive.length - "zip".length),
          path: join(sourceRoot, archive),
          sourceRoot,
          targetPath
        });
      }
      const archiveLoader = this.findExact(sourceRoot, archive);
      if (archiveLoader) {
        return new Extractor({
          preload: async ({verbose}) => archiveLoader.load({verbose}),
          inflatePath: targetPath.slice(archive.length - "zip".length),
          path: archiveLoader.path,
          sourceRoot,
          targetPath
        });
      }
    }
  }

  private static findExact(sourceRoot: string, targetPath: string): Loader | undefined {
    for (const ext in languages) {
      if (!existsSync(join(sourceRoot, targetPath + ext))) continue;
      if (extname(targetPath) === "") {
        console.warn(`invalid data loader path: ${targetPath + ext}`);
        return;
      }
      const path = join(sourceRoot, targetPath + ext);
      return new CommandLoader({
        command: languages[ext] ?? path,
        args: languages[ext] == null ? [] : [path],
        path,
        sourceRoot,
        targetPath
      });
    }
  }

  /**
   * Runs this loader, returning the path to the generated output file relative
   * to the source root; this is within the .observablehq/cache folder within
   * the source root.
   */
  async load(options: LoadOptions = {}): Promise<string> {
    const {verbose = true} = options;
    const key = join(this.sourceRoot, this.targetPath);
    let command = runningCommands.get(key);
    if (!command) {
      command = (async () => {
        const outputPath = join(".observablehq", "cache", this.targetPath);
        const cachePath = join(this.sourceRoot, outputPath);
        const loaderStat = await maybeStat(this.path);
        const cacheStat = await maybeStat(cachePath);
        if (!cacheStat) verbose && process.stdout.write(faint("[missing] "));
        else if (cacheStat.mtimeMs < loaderStat!.mtimeMs) verbose && process.stdout.write(faint("[stale] "));
        else return verbose && process.stdout.write(faint("[fresh] ")), outputPath;
        const tempPath = join(this.sourceRoot, ".observablehq", "cache", `${this.targetPath}.${process.pid}`);
        await prepareOutput(tempPath);
        const tempFd = await open(tempPath, "w");
        try {
          await this.exec(tempFd.createWriteStream({highWaterMark: 1024 * 1024}), options);
          await mkdir(dirname(cachePath), {recursive: true});
          await rename(tempPath, cachePath);
        } catch (error) {
          await unlink(tempPath);
          throw error;
        } finally {
          await tempFd.close();
        }
        return outputPath;
      })();
      command.finally(() => runningCommands.delete(this.path)).catch(() => {});
      runningCommands.set(this.path, command);
    }
    if (verbose) {
      process.stdout.write(`load ${this.path} → `);
      const start = performance.now();
      command.then(
        (path) => {
          console.log(
            `${green("success")} ${formatSize(statSync(join(this.sourceRoot, path)).size)} in ${formatElapsed(start)}`
          );
        },
        (error) => {
          console.log(`${red("error")} after ${formatElapsed(start)}: ${error.message}`);
        }
      );
    }
    return command;
  }

  abstract exec(out: WriteStream, options?: LoadOptions): Promise<void>;
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

  constructor({command, args, path, sourceRoot, targetPath}) {
    super({path, sourceRoot, targetPath});
    this.command = command;
    this.args = args;
  }

  async exec(out: WriteStream): Promise<void> {
    const subprocess = spawn(this.command, this.args, {windowsHide: true, stdio: ["ignore", "pipe", "inherit"]});
    subprocess.stdout.pipe(out);
    const code = await new Promise((resolve, reject) => {
      subprocess.on("error", reject);
      subprocess.on("close", resolve);
    });
    if (code !== 0) {
      throw new Error(`exited with code ${code}`);
    }
  }
}

class Extractor extends Loader {
  private readonly preload: (options?: LoadOptions) => Promise<string>;
  private readonly inflatePath: string;

  constructor({preload, inflatePath, path, sourceRoot, targetPath}) {
    super({path, sourceRoot, targetPath});
    this.preload = preload;
    this.inflatePath = inflatePath;
  }

  async exec(out: WriteStream, options: LoadOptions = {}): Promise<void> {
    const archivePath = join(this.sourceRoot, await this.preload(options));
    const file = (await JSZip.loadAsync(await readFile(archivePath))).file(this.inflatePath);
    if (!file) throw Object.assign(new Error("file not found"), {code: "ENOENT"});
    const pipe = file.nodeStream().pipe(out);
    await new Promise((resolve, reject) => pipe.on("error", reject).on("finish", resolve));
  }
}

const faint = color(2);
const red = color(31);
const green = color(32);
const yellow = color(33);

function color(code) {
  return process.stdout.isTTY ? (text) => `\x1b[${code}m${text}\x1b[0m` : String;
}

function formatSize(size) {
  if (!size) return yellow("empty output");
  const e = Math.floor(Math.log(size) / Math.log(1024));
  return `output ${+(size / 1024 ** e).toFixed(2)} ${["bytes", "KiB", "MiB", "GiB", "TiB"][e]}`;
}

function formatElapsed(start) {
  const elapsed = performance.now() - start;
  return `${Math.floor(elapsed)}ms`;
}
