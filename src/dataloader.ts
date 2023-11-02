import {open, rename, unlink} from "node:fs/promises";
import {spawn} from "node:child_process";
import {join} from "node:path";
import {getStats} from "./files.js";

const runningCommands = new Map<string, Promise<void>>();

export async function runCommand(commandPath: string, outputPath: string) {
  if (runningCommands.has(commandPath)) return runningCommands.get(commandPath);
  const command = new Promise<void>((resolve, reject) => {
    const cacheTempPath = outputPath + ".tmp";
    open(cacheTempPath, "w").then((cacheFd) => {
      const cacheFileStream = cacheFd.createWriteStream({highWaterMark: 1024 * 1024});
      try {
        const subprocess = spawn(commandPath, [], {
          argv0: commandPath,
          //cwd: dirname(commandPath), // TODO: Need to change commandPath to be relative this?
          windowsHide: true,
          stdio: ["ignore", "pipe", "inherit"]
          // timeout: // time in ms
          // signal: // abort signal
        });
        subprocess.stdout.on("data", (data) => cacheFileStream.write(data));
        subprocess.on("error", (error) => console.error(`${commandPath}: ${error.message}`));
        subprocess.on("close", (code) => {
          cacheFd.close();
          if (code === 0) {
            rename(cacheTempPath, outputPath);
          } else {
            unlink(cacheTempPath);
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      } finally {
        runningCommands.delete(commandPath);
      }
    });
  });
  runningCommands.set(commandPath, command);
  return command;
}

export async function findLoader(root: string, name: string) {
  // TODO: Look in the directory for any file with a known extension?
  const path = join(root, name) + ".js";
  const stats = await getStats(path);
  return {path, stats};
}
