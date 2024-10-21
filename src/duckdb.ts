import {existsSync} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path/posix";
import type {DuckDBConfig} from "./config.js";
import {faint} from "./tty.js";

const downloadRequests = new Map<string, Promise<string>>();

export const DUCKDBWASMVERSION = "1.29.0";
export const DUCKDBVERSION = "1.1.1";

async function getDuckDBExtension(root, platform, source, name, aliases) {
  let ext = await resolveDuckDBExtension(root, platform, source, name);
  if (aliases?.has(ext)) ext = aliases.get(ext)!;
  return dirname(dirname(dirname(ext)));
}

export async function getDuckDBManifest(
  duckdb: DuckDBConfig,
  {root, aliases}: {root: string; aliases?: Map<string, string>}
) {
  return {
    bundles: duckdb.bundles,
    extensions: await Promise.all(
      Array.from(Object.entries(duckdb.extensions), ([name, {install, load, source}]) =>
        (async () => {
          return [
            name,
            {
              install,
              load,
              ...Object.fromEntries(
                await Promise.all(
                  duckdb.bundles.map(async (platform) => [
                    platform,
                    await getDuckDBExtension(root, platform, source, name, aliases)
                  ])
                )
              )
            }
          ];
        })()
      )
    )
  };
}

/**
 * Given a duckdb configuration and an extension name such as "parquet", saves
 * the binary to _duckdb/{hash}/v1.1.1/wasm_{p}/parquet.duckdb_extension.wasm
 * for every supported platform p ("eh" and "mvp"), and returns a content-hashed
 * reference (_duckdb/{hash}) to use in the corresponding DuckDB INSTALL
 * statement. The repo is structured as required by DuckDB with:
 * ${repo}/v{duckdbversion}/wasm_{platform}/${name}.duckdb_extension.wasm
 */
export async function resolveDuckDBExtension(
  root: string,
  platform: string,
  repo: string,
  name: string
): Promise<string> {
  if (!repo.startsWith("https://")) throw new Error(`invalid repo: ${repo}`);
  const cache = join(root, ".observablehq", "cache");
  const file = `${name}.duckdb_extension.wasm`;
  const ref = `${repo}/v${DUCKDBVERSION}/wasm_${platform}/${file}`.slice("https://".length);
  const path = join("_duckdb", ref);
  const cachePath = join(cache, path);
  if (existsSync(cachePath)) return `/${path}`;
  let promise = downloadRequests.get(cachePath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    const href = `https://${ref}`;
    console.log(`duckdb:${href} ${faint("→")} ${cachePath}`);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    await mkdir(dirname(cachePath), {recursive: true});
    await writeFile(cachePath, Buffer.from(await response.arrayBuffer()));
    return `/${path}`;
  })();
  promise.catch(console.error).then(() => downloadRequests.delete(cachePath));
  downloadRequests.set(cachePath, promise);
  return promise;
}
