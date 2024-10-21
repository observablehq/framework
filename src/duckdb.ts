import {existsSync} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path/posix";
import {cross} from "d3-array";
import type {DuckDBConfig} from "./config.js";
import {faint} from "./tty.js";

const downloadRequests = new Map<string, Promise<string>>();

export async function duckDBManifest(
  duckdb: DuckDBConfig,
  {root, aliases}: {root: string; aliases?: Map<string, string>}
) {
  return {
    bundles: duckdb.bundles,
    extensions: await Promise.all(
      cross(duckdb.bundles, duckdb.install).map(async ([p, name]) => {
        let ext = await resolveDuckDBExtension(root, p, duckdb.source[name], name);
        if (aliases?.has(ext)) ext = aliases.get(ext)!;
        return [
          name,
          {
            ref: dirname(dirname(dirname(ext))),
            load: duckdb.load.includes(name),
            bundle: p
          }
        ];
      })
    )
  };
}

/**
 * Given a duckdb configuration and an extension name such as "parquet", saves
 * the binary to _duckdb/{hash}/v1.1.1/wasm_{p}/parquet.duckdb_extension.wasm
 * for every supported platform p ("eh" and "mvp"), and returns a content-hashed
 * reference (_duckdb/{hash}) to use in the corresponding DuckDB INSTALL
 * statement. The repo is structured as required by DuckDB with:
 * ${repo}/v1.1.1/wasm_{p}/${name}.duckdb_extension.wasm
 */
export async function resolveDuckDBExtension(root: string, p: string, repo: string, name: string): Promise<string> {
  if (!repo.startsWith("https://")) throw new Error(`invalid repo: ${repo}`);
  const cache = join(root, ".observablehq", "cache");
  const file = `${name}.duckdb_extension.wasm`;
  const ref = `${repo}/v1.1.1/wasm_${p}/${file}`.slice("https://".length);
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
