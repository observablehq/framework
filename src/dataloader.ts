import {open} from "node:fs/promises";
import {spawn} from "node:child_process";
import {join} from "node:path";
import {getStats, prepareOutput} from "./files.js";
import {renameSync, unlinkSync} from "node:fs";

const runningCommands = new Map<string, Promise<void>>();

export async function runCommand(commandPath: string, outputPath: string) {
  if (runningCommands.has(commandPath)) return runningCommands.get(commandPath);
  const command = new Promise<void>((resolve, reject) => {
    const outputTempPath = outputPath + ".tmp";
    prepareOutput(outputTempPath).then(() =>
      open(outputTempPath, "w").then((cacheFd) => {
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
            cacheFd.close().then(() => {
              if (code === 0) {
                renameSync(outputTempPath, outputPath);
              } else {
                unlinkSync(outputTempPath);
              }
              resolve();
            }, reject);
          });
        } catch (error) {
          reject(error);
        } finally {
          runningCommands.delete(commandPath);
        }
      })
    );
  });
  runningCommands.set(commandPath, command);
  return command;
}

export async function findLoader(root: string, name: string) {
  // TODO: It may be more efficient use fs.readdir
  for (const ext of [".js", ".ts"]) {
    const path = join(root, name) + ext;
    const stats = await getStats(path);
    if (stats) return {path, stats};
  }
  return {};
}
