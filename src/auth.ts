import fs from "node:fs/promises";
import path from "node:path";
import xdg from "@folder/xdg";

const configDir = path.join(xdg().config, "observable");
const configPath = path.join(configDir, "config.json");

interface Config {
  auth?: {
    id: string;
    key: string;
  };
}

export async function setObservableApiKey(id: string, key: string): Promise<void> {
  const config = await loadConfig();
  config.auth = {id, key};
  await writeConfig(config);
}

export async function getObservableApiKey(): Promise<string | null> {
  const config = await loadConfig();
  return config.auth?.key ?? null;
}

async function loadConfig(): Promise<Config> {
  try {
    return JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return {};
    throw err;
  }
}

async function writeConfig(config: Config): Promise<void> {
  try {
    await fs.mkdir(configDir, {recursive: true});
  } catch (err) {
    console.warn(err);
    // Try to write the file anyways
  }
  await fs.writeFile(configPath, JSON.stringify(config));
}
