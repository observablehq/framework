import os from "node:os";
import {mkdir, readFile, writeFile} from "./brandedFs.js";
import {FilePath, fileDirname, fileJoin, fileResolve} from "./brandedPath.js";
import {CliError, isEnoent} from "./error.js";

export interface ConfigEffects {
  readFile: (path: FilePath, encoding: "utf8") => Promise<string>;
  writeFile: (path: FilePath, contents: string) => Promise<void>;
  env: typeof process.env;
  cwd: () => FilePath;
  mkdir: (path: FilePath, options?: {recursive?: boolean}) => Promise<void>;
  homedir: () => FilePath;
}

export const defaultEffects: ConfigEffects = {
  readFile: (path, encoding) => readFile(path, encoding),
  writeFile,
  mkdir: async (path, options) => {
    await mkdir(path, options);
  },
  env: process.env,
  cwd: () => FilePath(process.cwd()),
  homedir: () => FilePath(os.homedir())
};

const userConfigName = ".observablehq";
interface UserConfig {
  auth?: {
    id: string;
    key: string;
  };
}

export interface DeployConfig {
  projectId?: string | null;
  projectSlug: string | null;
  workspaceLogin: string | null;
}

export type ApiKey =
  | {source: "file"; filePath: FilePath; key: string}
  | {source: "env"; envVar: string; key: string}
  | {source: "test"; key: string}
  | {source: "login"; key: string};

export async function getObservableApiKey(effects: ConfigEffects = defaultEffects): Promise<ApiKey | null> {
  const envVar = "OBSERVABLE_TOKEN";
  if (effects.env[envVar]) {
    return {source: "env", envVar, key: effects.env[envVar]};
  }
  const {config, configPath} = await loadUserConfig();
  if (config.auth?.key) {
    return {source: "file", filePath: configPath, key: config.auth.key};
  }
  return null;
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

export async function getDeployConfig(
  sourceRoot: FilePath,
  effects: ConfigEffects = defaultEffects
): Promise<DeployConfig> {
  const deployConfigPath = fileJoin(effects.cwd(), sourceRoot, ".observablehq", "deploy.json");
  let config: object | null = null;
  try {
    const content = await effects.readFile(deployConfigPath, "utf8");
    config = JSON.parse(content);
  } catch (error) {
    if (!isEnoent(error)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CliError(`Could not read config file at ${deployConfigPath}: ${message}`, {cause: error});
    }
  }
  // normalize
  let {projectId, projectSlug, workspaceLogin} = config ?? ({} as any);
  if (typeof projectId !== "string") projectId = null;
  if (typeof projectSlug !== "string") projectSlug = null;
  if (typeof workspaceLogin !== "string") workspaceLogin = null;
  return {projectId, projectSlug, workspaceLogin};
}

export async function setDeployConfig(
  sourceRoot: FilePath,
  newConfig: DeployConfig,
  effects: ConfigEffects = defaultEffects
): Promise<void> {
  const dir = fileJoin(effects.cwd(), sourceRoot, ".observablehq");
  const deployConfigPath = fileJoin(dir, "deploy.json");
  const oldConfig = (await getDeployConfig(sourceRoot)) || {};
  const merged = {...oldConfig, ...newConfig};
  await effects.mkdir(dir, {recursive: true});
  await effects.writeFile(deployConfigPath, JSON.stringify(merged, null, 2) + "\n");
}

export async function loadUserConfig(
  effects: ConfigEffects = defaultEffects
): Promise<{configPath: FilePath; config: UserConfig}> {
  const homeConfigPath = fileJoin(effects.homedir(), userConfigName);

  function* pathsToTry(): Generator<FilePath> {
    let cursor = fileResolve(effects.cwd());
    while (true) {
      yield fileJoin(cursor, userConfigName);
      const nextCursor = fileDirname(cursor);
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }
    yield homeConfigPath;
  }

  for (const configPath of pathsToTry()) {
    let content: string | null = null;
    try {
      content = await effects.readFile(configPath, "utf8");
    } catch (error) {
      if (!isEnoent(error)) throw error;
    }

    if (content !== null) {
      try {
        return {config: JSON.parse(content), configPath};
      } catch (error) {
        throw new CliError(`Problem parsing config file at ${configPath}: ${error}`, {cause: error});
      }
    }
  }

  return {config: {}, configPath: homeConfigPath};
}

async function writeUserConfig(
  {configPath, config}: {configPath: FilePath; config: UserConfig},
  effects: ConfigEffects = defaultEffects
): Promise<void> {
  await effects.writeFile(configPath, JSON.stringify(config, null, 2));
}
