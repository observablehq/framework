import {spawn} from "node:child_process";
import {type Stats} from "node:fs";
import {constants, open, rename, unlink} from "node:fs/promises";
import {maybeStat, prepareOutput} from "./files.js";

const runningCommands = new Map<string, Promise<void>>();

export interface Loader {
  path: string;
  stats: Stats;
}

export async function runLoader(commandPath: string, outputPath: string) {
  const c = process.stdout.isTTY
    ? {info: "\x1b[33m", success: "\x1b[36m", error: "\x1b[31m", close: "\x1b[0m"}
    : {info: "", success: "", error: "", close: ""};
  if (runningCommands.has(commandPath)) return runningCommands.get(commandPath);
  const time = performance.now();
  const id = `${c.success}[${((time * 10000) | 1).toString(16)}]${c.close}`;
  let code;
  console.info(id, `"${commandPath}"`, `${c.info}start${c.close}`, new Date());
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
      id,
      `"${commandPath}"`,
      code === 0 ? `${c.success}success${c.close}` : `${c.error}error${c.close}`,
      `${Math.floor(performance.now() - time)}ms`,
      code === 0 ? bytes((await maybeStat(outputPath))?.size) : ""
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

function bytes(size) {
  if (!size) return "\x1b[31mempty output\x1b[0m";
  const e = Math.floor(Math.log(size) / Math.log(1024));
  return `${+(size / 1024 ** e).toFixed(2)} ${["bytes", "KiB", "MiB", "GiB", "TiB"][e]}`;
}
