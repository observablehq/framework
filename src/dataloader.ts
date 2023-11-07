import {spawn} from "node:child_process";
import {type Stats} from "node:fs";
import {open, constants, rename, unlink} from "node:fs/promises";
import {prepareOutput, maybeStat} from "./files.js";

const runningCommands = new Map<string, Promise<void>>();

export interface Loader {
  path: string;
  stats: Stats;
}

export async function runLoader(commandPath: string, outputPath: string) {
  if (runningCommands.has(commandPath)) return runningCommands.get(commandPath);
  const command = (async () => {
    const outputTempPath = outputPath + ".tmp";
    await prepareOutput(outputTempPath);
    const cacheFd = await open(outputTempPath, "w");
    const cacheFileStream = cacheFd.createWriteStream({highWaterMark: 1024 * 1024});
    const subprocess = spawn(commandPath, [], {
      argv0: commandPath,
      //cwd: dirname(commandPath), // TODO: Need to change commandPath to be relative this?
      windowsHide: true,
      stdio: ["ignore", "pipe", "inherit"]
      // timeout: // time in ms
      // signal: // abort signal
    });
    subprocess.stdout.pipe(cacheFileStream);
    const code = await new Promise((resolve, reject) => {
      subprocess.on("error", reject); // (error) => console.error(`${commandPath}: ${error.message}`));
      subprocess.on("close", resolve);
    });
    await cacheFd.close();
    if (code === 0) {
      await rename(outputTempPath, outputPath);
    } else {
      await unlink(outputTempPath);
    }
  })();
  command.finally(() => runningCommands.delete(commandPath));
  runningCommands.set(commandPath, command);
  return command;
}

export async function findLoader(name: string): Promise<Loader | undefined> {
  // TODO: It may be more efficient use fs.readdir
  for (const ext of [".js", ".ts", ".sh"]) {
    const path = name + ext;
    const stats = await maybeStat(path);
    if (stats && stats.mode & constants.S_IXUSR) {
      return {path, stats};
    }
  }
}
