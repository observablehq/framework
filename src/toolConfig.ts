import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {isEnoent} from "./error.js";

const configName = ".observablehq";

interface Config {
  auth?: {
    id: string;
    key: string;
  };
}

export async function setObservableApiKey(id: string, key: string): Promise<void> {
  const {config, configPath} = await loadConfig();
  config.auth = {id, key};
  await writeConfig({configPath, config});
}

export async function getObservableApiKey(): Promise<string | null> {
  const {config} = await loadConfig();
  return config.auth?.key ?? null;
}

async function loadConfig(): Promise<{configPath: string; config: Config}> {
  let cursor = path.resolve(process.cwd());
  while (true) {
    const configPath = path.join(cursor, configName);
    let content: string | null = null;
    try {
      content = await fs.readFile(configPath, "utf8");
    } catch (error) {
      if (!isEnoent(error)) throw error;
      const nextCursor = path.dirname(cursor);
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }

    if (content !== null) {
      try {
        return {config: JSON.parse(content), configPath};
      } catch (err) {
        console.error(`Problem parsing config file at ${configPath}: ${err}`);
      }
    }
  }

  return {config: {}, configPath: path.join(os.homedir(), configName)};
}

async function writeConfig({configPath, config}: {configPath: string; config: Config}): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
