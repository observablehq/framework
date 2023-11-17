import {stat} from "node:fs/promises";
import {join} from "node:path";

export interface Page {
  name: string;
  path: string;
}

export interface Section {
  name: string;
  open?: boolean;
  pages: Page[];
}

export interface Config {
  title?: string;
  base?: string;
  pages?: (Page | Section)[]; // TODO rename to sidebar?
}

export async function readConfig(root: string): Promise<Config | undefined> {
  for (const ext of [".js", ".ts"]) {
    let config;
    try {
      const configPath = join(process.cwd(), root, ".observablehq", "config" + ext);
      const configStat = await stat(configPath);
      // By using the modification time of the config, we ensure that we pick up
      // any changes to the config on reload. TODO It would be better to either
      // restart the preview server when the config changes, or for the preview
      // server to watch the config file and hot-reload it automatically.
      config = (await import(`${configPath}?${configStat.mtimeMs}`)).default;
    } catch {
      continue;
    }
    if (!config?.base.match(/^[/]\w+[/]$/)) throw new Error(`invalid base: ${config.base}`);
    return config;
  }
}
