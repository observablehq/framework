import {existsSync} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path/posix";
import type {DuckDBConfig} from "./config.js";
import {faint} from "./tty.js";

const downloadRequests = new Map<string, Promise<string>>();

export const DUCKDB_WASM_VERSION = "1.29.0";
export const DUCKDB_VERSION = "1.1.1";

// https://duckdb.org/docs/extensions/core_extensions.html
export const DUCKDB_CORE_ALIASES: Record<string, keyof typeof DUCKDB_CORE_EXTENSIONS> = {
  sqlite: "sqlite_scanner",
  sqlite3: "sqlite_scanner",
  postgres_scanner: "postgres",
  http: "httpfs",
  https: "httpfs",
  s3: "httpfs"
} as const;

// https://duckdb.org/docs/extensions/core_extensions.html
// https://duckdb.org/docs/api/wasm/extensions.html#list-of-officially-available-extensions
export const DUCKDB_CORE_EXTENSIONS = {
  arrow: false,
  autocomplete: true,
  aws: true,
  azure: true,
  delta: true,
  excel: true,
  fts: true,
  httpfs: true,
  iceberg: false,
  icu: true,
  inet: true,
  jemalloc: false,
  json: true,
  mysql: false,
  parquet: true,
  postgres: true,
  spatial: false,
  sqlite_scanner: true,
  substrait: false,
  tpcds: true,
  tpch: true,
  vss: false
} as const;

export async function getDuckDBManifest(
  {platforms, extensions}: DuckDBConfig,
  {root, aliases}: {root: string; aliases?: Map<string, string>}
) {
  return {
    platforms: {mvp: "mvp" in platforms, eh: "eh" in platforms},
    extensions: Object.fromEntries(
      await Promise.all(
        Object.entries(extensions).map(([name, {install, load, source}]) =>
          (async () => [
            name,
            {
              install,
              load,
              ...Object.fromEntries(
                await Promise.all(
                  Object.keys(platforms).map(async (platform) => [
                    platform,
                    install
                      ? await getDuckDBExtension(root, resolveDuckDBExtension(source, platform, name), aliases)
                      : source
                  ])
                )
              )
            }
          ])()
        )
      )
    )
  };
}

export function resolveDuckDBExtension(repo: string, platform: string, name: string): URL {
  return new URL(`v${DUCKDB_VERSION}/wasm_${platform}/${name}.duckdb_extension.wasm`, repo);
}

/**
 * Returns the extension “custom repository” location as needed for DuckDB’s
 * INSTALL command. This is the relative path to which DuckDB will implicitly add
 * v{version}/wasm_{platform}/{name}.duckdb_extension.wasm, assuming that the
 * manifest is baked into /_observablehq/stdlib/duckdb.js.
 *
 * https://duckdb.org/docs/extensions/working_with_extensions#creating-a-custom-repository
 */
async function getDuckDBExtension(root: string, href: string | URL, aliases?: Map<string, string>) {
  let ext = await cacheDuckDBExtension(root, href);
  if (aliases?.has(ext)) ext = aliases.get(ext)!;
  return join("..", "..", dirname(dirname(dirname(ext))));
}

/**
 * Saves the given DuckDB extension to the .observablehq/cache/_duckdb cache,
 * as {origin}/{path}/{name}.duckdb_extension.wasm, returning the serving path
 * to the saved file in the cache (starting with /_duckdb).
 *
 * https://duckdb.org/docs/extensions/overview#installation-location
 */
export async function cacheDuckDBExtension(root: string, href: string | URL): Promise<string> {
  const url = new URL(href);
  if (url.protocol !== "https:") throw new Error(`unsupported protocol: ${url.protocol}`);
  const key = String(url).slice("https://".length);
  const path = join("_duckdb", key);
  const cache = join(root, ".observablehq", "cache");
  const cachePath = join(cache, path);
  if (existsSync(cachePath)) return `/${path}`;
  let promise = downloadRequests.get(cachePath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    console.log(`duckdb:${key} ${faint("→")} ${cachePath}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unable to fetch: ${url}`);
    await mkdir(dirname(cachePath), {recursive: true});
    await writeFile(cachePath, Buffer.from(await response.arrayBuffer()));
    return `/${path}`;
  })();
  promise.catch(console.error).then(() => downloadRequests.delete(cachePath));
  downloadRequests.set(cachePath, promise);
  return promise;
}
