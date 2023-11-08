import {spawn} from "node:child_process";
import {type Stats} from "node:fs";
import {constants, open, rename, unlink} from "node:fs/promises";
import {maybeStat, prepareOutput} from "./files.js";

const runningCommands = new Map<string, Promise<void>>();

export interface Loader {
  path: string;
  stats: Stats;
}

const error = color(31);
const success = color(32);
const warning = color(33);
function color(code) {
  return process.stdout.isTTY ? (text) => `\x1b[${code}m${text}\x1b[0m` : String;
}

export async function runLoader(commandPath: string, outputPath: string) {
  if (runningCommands.has(commandPath)) return runningCommands.get(commandPath);
  const time = performance.now();
  let code;
  console.info(`${commandPath} start`);
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
    code = await new Promise((resolve, reject) => {
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
  command.finally(async () => {
    runningCommands.delete(commandPath);
    console.info(
      `${commandPath} ${
        code === 0
          ? `${success("success")} ${outputBytes((await maybeStat(outputPath))?.size)} in ${Math.floor(
              performance.now() - time
            )}ms`
          : error("error")
      }`
    );
  });
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

function outputBytes(size) {
  if (!size) return warning("empty output");
  const e = Math.floor(Math.log(size) / Math.log(1024));
  return `output ${+(size / 1024 ** e).toFixed(2)} ${["bytes", "KiB", "MiB", "GiB", "TiB"][e]}`;
}
