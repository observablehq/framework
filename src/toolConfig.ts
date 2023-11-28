import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {isEnoent} from "./error.js";

const observabelConfigName = ".observablehq";
const projectConfigName = ".project";

interface ObservableConfig {
  auth?: {
    id: string;
    key: string;
  };
}

export interface ProjectConfig {
  id?: string;
  slug?: string;
}

export async function getObservableApiKey(): Promise<string | null> {
  const {config} = await loadObservableConfig();
  return config.auth?.key ?? null;
}

export async function setObservableApiKey(id: string, key: string): Promise<void> {
  const {config, configPath} = await loadObservableConfig();
  config.auth = {id, key};
  await writeConfig({config, configPath});
}

export async function getProjectId(): Promise<string | null> {
  const {config} = await loadProjectConfig();
  return config.id ?? null;
}

export async function setProjectConfig(newConfig: ProjectConfig): Promise<void> {
  const {config, configPath} = await loadProjectConfig();
  await writeConfig({
    config: {...config, ...newConfig},
    configPath
  });
}

async function loadObservableConfig(): Promise<{configPath: string; config: ObservableConfig}> {
  return loadConfig(observabelConfigName);
}

async function loadProjectConfig(): Promise<{configPath: string; config: ProjectConfig}> {
  return loadConfig(projectConfigName, true);
}

async function loadConfig(
  configName: string,
  stopAtProjectRoot: boolean = false
): Promise<{configPath: string; config: any}> {
  let cursor = path.resolve(process.cwd());
  while (true) {
    const configPath = path.join(cursor, configName);
    let content: string | null = null;
    try {
      content = await fs.readFile(configPath, "utf8");
    } catch (error) {
      if (!isEnoent(error)) throw error;
      if (stopAtProjectRoot) {
        try {
          await fs.stat(path.join(cursor, "package.json"));
          // Existence of package.json means we're at project root, so stop.
          return {config: {}, configPath: path.join(cursor, configName)};
        } catch (error) {
          // Ignore failed stat.
        }
      }
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

async function writeConfig({
  configPath,
  config
}: {
  configPath: string;
  config: ObservableConfig | ProjectConfig;
}): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
