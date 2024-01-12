import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {isEnoent} from "./error.js";
import type {Logger} from "./logger.js";
import {commandRequiresAuthenticationMessage} from "./observableApiAuth.js";

const userConfigName = ".observablehq";
interface UserConfig {
  auth?: {
    id: string;
    key: string;
  };
}

export interface DeployConfig {
  projectId: null | string;
}

export type ApiKey =
  | {source: "file"; filePath: string; key: string}
  | {source: "env"; envVar: string; key: string}
  | {source: "test"; key: string};

export async function getObservableApiKey(logger: Logger = console): Promise<ApiKey> {
  const envVar = "OBSERVABLE_TOKEN";
  if (process.env[envVar]) {
    return {source: "env", envVar, key: process.env[envVar]};
  }
  const {config, configPath} = await loadUserConfig();
  if (config.auth?.key) {
    return {source: "file", filePath: configPath, key: config.auth.key};
  }
  logger.log(commandRequiresAuthenticationMessage);
  process.exit(1);
}

export async function setObservableApiKey(info: null | {id: string; key: string}): Promise<void> {
  const {config, configPath} = await loadUserConfig();
  if (info) {
    config.auth = info;
  } else {
    delete config.auth;
  }
  await writeUserConfig({config, configPath});
}

export async function getDeployConfig(sourceRoot: string): Promise<DeployConfig | null> {
  const deployConfigPath = path.join(process.cwd(), sourceRoot, ".observablehq", "deploy.json");
  let content: string | null = null;
  try {
    content = await fs.readFile(deployConfigPath, "utf8");
  } catch (error) {
    content = "{}";
  }
  // normalize
  let {projectId} = JSON.parse(content);
  if (typeof projectId !== "string") projectId = null;
  return {projectId};
}

export async function setDeployConfig(sourceRoot: string, newConfig: DeployConfig): Promise<void> {
  const dir = path.join(process.cwd(), sourceRoot, ".observablehq");
  const deployConfigPath = path.join(dir, "deploy.json");
  const oldConfig = (await getDeployConfig(sourceRoot)) || {};
  const merged = {...oldConfig, ...newConfig};
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(deployConfigPath, JSON.stringify(merged, null, 2) + "\n");
}

async function loadUserConfig(): Promise<{configPath: string; config: UserConfig}> {
  let cursor = path.resolve(process.cwd());
  while (true) {
    const configPath = path.join(cursor, userConfigName);
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

  return {config: {}, configPath: path.join(os.homedir(), userConfigName)};
}

async function writeUserConfig({configPath, config}: {configPath: string; config: UserConfig}): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
