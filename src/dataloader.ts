import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {open, rename, unlink} from "node:fs/promises";
import {join} from "node:path";
import {maybeStat, prepareOutput} from "./files.js";

const runningCommands = new Map<string, Promise<string>>();

export class Loader {
  /**
   * The command to run; such as "node" for a JavaScript loader, or the path to
   * loader executable relative to the current working directory.
   */
  readonly command: string;

  /**
   * Any args to pass to the command. For a JavaScript or TypeScript loader, it
   * is the path to the loader script relative to the current working directory.
   */
  readonly args: string[];

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

  private constructor({command, args, path, sourceRoot, targetPath}) {
    this.command = command;
    this.args = args;
    this.path = path;
    this.sourceRoot = sourceRoot;
    this.targetPath = targetPath;
  }

  /**
   * Finds the loader for the specified target path, relative to the specified
   * source root, if it exists. If there is no such loader, returns undefined.
   */
  static find(sourceRoot: string, targetPath: string): Loader | undefined {
    for (const ext of [".js", ".ts", ".sh"]) {
      const sourcePath = targetPath + ext;
      const path = join(sourceRoot, sourcePath);
      if (!existsSync(path)) continue;
      return new Loader({
        command: ext === ".js" ? "node" : ext === ".ts" ? "tsx" : "sh",
        args: [path],
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
  async load(): Promise<string> {
    let command = runningCommands.get(this.path);
    if (command) return command;
    command = (async () => {
      const outputPath = join(".observablehq", "cache", this.targetPath);
      const cachePath = join(this.sourceRoot, outputPath);
      const loaderStat = await maybeStat(this.path);
      const cacheStat = await maybeStat(cachePath);
      if (cacheStat && cacheStat.mtimeMs > loaderStat!.mtimeMs) return outputPath;
      const tempPath = join(".observablehq", "cache", `${this.targetPath}.${process.pid}`);
      await prepareOutput(tempPath);
      const tempFd = await open(tempPath, "w");
      const tempFileStream = tempFd.createWriteStream({highWaterMark: 1024 * 1024});
      const subprocess = spawn(this.command, this.args, {windowsHide: true, stdio: ["ignore", "pipe", "inherit"]});
      subprocess.stdout.pipe(tempFileStream);
      const code = await new Promise((resolve, reject) => {
        subprocess.on("error", reject);
        subprocess.on("close", resolve);
      });
      await tempFd.close();
      if (code === 0) {
        await rename(tempPath, cachePath);
      } else {
        await unlink(tempPath);
        throw new Error(`loader exited with code ${code}`);
      }
      return outputPath;
    })();
    command.finally(() => runningCommands.delete(this.path)).catch(() => {});
    runningCommands.set(this.path, command);
    return command;
  }
}
