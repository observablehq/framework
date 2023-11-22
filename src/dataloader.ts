import {spawn} from "node:child_process";
import {existsSync, statSync} from "node:fs";
import {mkdir, open, rename, unlink} from "node:fs/promises";
import {dirname, extname, join} from "node:path";
import {HttpError} from "./error.js";
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

export class Loader {
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
   * A file to inflate from the generated file.
   */
  readonly inflate?: string;

  private constructor({command, args, path, sourceRoot, targetPath, inflate}) {
    this.command = command;
    this.args = args;
    this.path = path;
    this.sourceRoot = sourceRoot;
    this.targetPath = targetPath;
    this.inflate = inflate;
    console.warn("new loader for", {command, args, path, sourceRoot, targetPath, inflate});
  }

  /**
   * Finds the loader for the specified target path, relative to the specified
   * source root, if it exists. If there is no such loader, returns undefined.
   */
  static find(sourceRoot: string, targetPath: string): Loader | undefined {
    const ext = this.findLoaderFor(sourceRoot, targetPath);
    if (ext) {
      const path = join(sourceRoot, targetPath + ext);
      return new Loader({
        command: languages[ext] ?? path,
        args: languages[ext] == null ? [] : [path],
        path,
        sourceRoot,
        targetPath,
        inflate: undefined
      });
    }

    let dir = targetPath;
    while ("/" !== (dir = dirname(dir))) {
      const archive = dir + ".zip";
      if (existsSync(join(sourceRoot, archive))) {
        return new Loader({
          command: "noop",
          args: undefined,
          path: join(sourceRoot, archive),
          sourceRoot,
          targetPath: archive,
          inflate: targetPath.slice(archive.length - "zip".length)
        });
      }
      const ext = this.findLoaderFor(sourceRoot, archive);
      if (ext) {
        const path = join(sourceRoot, archive + ext);
        return new Loader({
          command: languages[ext] ?? path,
          args: languages[ext] == null ? [] : [path],
          path,
          sourceRoot,
          targetPath: archive,
          inflate: targetPath.slice(archive.length - "zip".length)
        });
      }
    }
  }

  static findLoaderFor(sourceRoot, targetPath) {
    for (const ext in languages) {
      if (!existsSync(join(sourceRoot, targetPath + ext))) continue;
      if (extname(targetPath) === "") {
        console.warn(`invalid data loader path: ${targetPath + ext}`);
        return;
      }
      return ext;
    }
  }

  /**
   * Runs this loader, returning the path to the generated output file relative
   * to the source root; this is within the .observablehq/cache folder within
   * the source root.
   */
  async load({verbose = true}: {verbose?: boolean} = {}): Promise<string> {
    let command = runningCommands.get(this.path);
    if (!command) {
      command = (
        this.command === "noop"
          ? async () => this.path.slice(this.sourceRoot.length)
          : async () => {
              const outputPath = join(".observablehq", "cache", this.targetPath);
              const cachePath = join(this.sourceRoot, outputPath);
              const loaderStat = await maybeStat(this.path);
              const cacheStat = await maybeStat(cachePath);
              if (!cacheStat) verbose && process.stdout.write(faint("[missing] "));
              else if (cacheStat.mtimeMs < loaderStat!.mtimeMs) verbose && process.stdout.write(faint("[stale] "));
              else return verbose && process.stdout.write(faint("[fresh] ")), outputPath;
              await callCommand(cachePath, this.command, this.args);
              return outputPath;
            }
      )();
      command.finally(() => runningCommands.delete(this.path)).catch(() => {});
      runningCommands.set(this.path, command);
      if (verbose && this.command !== "noop") {
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
    }
    return !this.inflate ? command : command.then((path) => inflate(this.sourceRoot, path, this.inflate));
  }
}

async function callCommand(cachePath, command, args) {
  const tempPath = `${cachePath}.${process.pid}`;
  await prepareOutput(tempPath);
  const tempFd = await open(tempPath, "w");
  const tempFileStream = tempFd.createWriteStream({highWaterMark: 1024 * 1024});
  const subprocess = spawn(command, args, {windowsHide: true, stdio: ["ignore", "pipe", "inherit"]});
  subprocess.stdout.pipe(tempFileStream);
  const code = await new Promise((resolve, reject) => {
    subprocess.on("error", reject);
    subprocess.on("close", resolve);
  });
  await tempFd.close();
  if (code === 0) {
    await mkdir(dirname(cachePath), {recursive: true});
    await rename(tempPath, cachePath);
  } else {
    await unlink(tempPath);
    throw new Error(`loader exited with code ${code}`);
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

// TODO: use jszip
async function inflate(sourceRoot, path, filename) {
  const targetPath = join(
    ".observablehq/cache",
    path.slice(0, -".zip".length).replace(/^\.observablehq\/cache/, ""),
    filename
  );
  const cachePath = join(sourceRoot, targetPath);
  const cacheStat = await maybeStat(cachePath);
  const archivePath = join(sourceRoot, path);
  const archiveStat = await maybeStat(archivePath);
  if (cacheStat && cacheStat.mtimeMs >= archiveStat!.mtimeMs) return targetPath;

  const tempPath = `${cachePath}.${process.pid}`;
  await prepareOutput(tempPath);
  const tempFd = await open(tempPath, "w");
  const tempFileStream = tempFd.createWriteStream({highWaterMark: 1024 * 1024});
  const subprocess = spawn("unzip", ["-j", "-p", archivePath, filename], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "inherit"]
  });
  subprocess.stdout.pipe(tempFileStream);
  const code = await new Promise((resolve, reject) => {
    subprocess.on("error", reject);
    subprocess.on("close", resolve);
  });
  await tempFd.close();
  if (code === 0) {
    await mkdir(dirname(cachePath), {recursive: true});
    await rename(tempPath, cachePath);
    console.log(`${green("inflated")} ${filename} from ${path}`);
    return targetPath;
  } else {
    if (code === 11) {
      console.log(`${red("inflate: missing")} ${filename} from ${path}`);
      await unlink(tempPath);
      return targetPath;
    }
    throw new HttpError("Internal error", 500);
  }
}
