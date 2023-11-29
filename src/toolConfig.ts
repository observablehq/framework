import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {isEnoent} from "./error.js";

const observableConfigName = ".observablehq";
interface ObservableConfig {
  auth?: {
    id: string;
    key: string;
  };
}

export interface DeployConfig {
  project?: {
    id?: string;
    slug?: string;
    workspace?: string;
  };
}

export async function getObservableApiKey(): Promise<string | null> {
  const {config} = await loadObservableConfig();
  return config.auth?.key ?? null;
}

export async function setObservableApiKey(id: string, key: string): Promise<void> {
  const {config, configPath} = await loadObservableConfig();
  config.auth = {id, key};
  await writeObservableConfig({config, configPath});
}

export async function getDeployConfig(sourceRoot: string): Promise<DeployConfig | null> {
  const deployConfigPath = path.join(process.cwd(), sourceRoot, ".observablehq", "deploy.json");
  let content: string | null = null;
  try {
    content = await fs.readFile(deployConfigPath, "utf8");
  } catch (error) {
    content = "{}";
  }
  return JSON.parse(content);
}

export async function setDeployConfig(sourceRoot: string, newConfig: DeployConfig): Promise<void> {
  const deployConfigPath = path.join(process.cwd(), sourceRoot, ".observablehq", "deploy.json");
  const oldConfig = (await getDeployConfig(sourceRoot)) || {};
  const merged = {...oldConfig, ...newConfig};
  await fs.writeFile(deployConfigPath, JSON.stringify(merged, null, 2));
}

async function loadObservableConfig(): Promise<{configPath: string; config: ObservableConfig}> {
  let cursor = path.resolve(process.cwd());
  while (true) {
    const configPath = path.join(cursor, observableConfigName);
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

  return {config: {}, configPath: path.join(os.homedir(), observableConfigName)};
}

async function writeObservableConfig({
  configPath,
  config
}: {
  configPath: string;
  config: ObservableConfig;
}): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
