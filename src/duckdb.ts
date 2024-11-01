import {existsSync} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path/posix";
import type {DuckDBConfig} from "./config.js";
import {faint} from "./tty.js";

const downloadRequests = new Map<string, Promise<string>>();

export const DUCKDB_WASM_VERSION = "1.29.0";
export const DUCKDB_VERSION = "1.1.1";
export const DUCKDB_BUNDLES = ["eh", "mvp"];

// https://duckdb.org/docs/extensions/core_extensions.html
export const DUCKDB_CORE_EXTENSIONS: [name: string, autoload: boolean][] = [
  ["arrow", false],
  ["autocomplete", true],
  ["aws", true],
  ["azure", true],
  ["delta", true],
  ["excel", true],
  ["fts", true],
  ["httpfs", true],
  ["iceberg", false],
  ["icu", true],
  ["inet", true],
  ["jemalloc", false],
  ["json", true],
  ["mysql", false],
  ["parquet", true],
  ["postgres", true],
  ["spatial", false],
  ["sqlite", true],
  ["substrait", false],
  ["tpcds", true],
  ["tpch", true],
  ["vss", false]
];

export async function getDuckDBManifest(
  duckdb: DuckDBConfig,
  {root, aliases}: {root: string; aliases?: Map<string, string>}
) {
  return {
    bundles: duckdb.bundles,
    extensions: await Promise.all(
      Array.from(Object.entries(duckdb.extensions), ([name, {install, load, source}]) =>
        (async () => [
          name,
          {
            install,
            load,
            ...Object.fromEntries(
              await Promise.all(
                duckdb.bundles.map(async (platform) => [
                  platform,
                  install ? await getDuckDBExtension(root, platform, source, name, aliases) : source
                ])
              )
            )
          }
        ])()
      )
    )
  };
}

/**
 * Returns the extension “custom repository” location as needed for DuckDB’s
 * INSTALL command. This is the relative path to which DuckDB will implicitly add
 * v{version}/wasm_{platform}/{name}.duckdb_extension.wasm, assuming that the
 * manifest is baked into /_observablehq/stdlib/duckdb.js.
 *
 * https://duckdb.org/docs/extensions/working_with_extensions#creating-a-custom-repository
 */
async function getDuckDBExtension(
  root: string,
  platform: string,
  source: string,
  name: string,
  aliases?: Map<string, string>
) {
  let ext = await resolveDuckDBExtension(root, platform, source, name);
  if (aliases?.has(ext)) ext = aliases.get(ext)!;
  return join("..", "..", dirname(dirname(dirname(ext))));
}

/**
 * Saves the given DuckDB extension to the .observablehq/cache/_duckdb cache,
 * as {repo}/v{version}/wasm_{platform}/{name}.duckdb_extension.wasm,
 * returning the serving path to the saved file in the cache (starting with
 * /_duckdb).
 *
 * https://duckdb.org/docs/extensions/overview#installation-location
 */
export async function resolveDuckDBExtension(
  root: string,
  platform: string,
  repo: string,
  name: string
): Promise<string> {
  const cache = join(root, ".observablehq", "cache");
  const file = `${name}.duckdb_extension.wasm`;
  const url = new URL(`v${DUCKDB_VERSION}/wasm_${platform}/${file}`, repo);
  if (url.protocol !== "https:") throw new Error(`invalid repo: ${repo}`);
  const path = join("_duckdb", String(url).slice("https://".length));
  const cachePath = join(cache, path);
  if (existsSync(cachePath)) return `/${path}`;
  let promise = downloadRequests.get(cachePath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    console.log(`duckdb:${url} ${faint("→")} ${cachePath}`);
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
