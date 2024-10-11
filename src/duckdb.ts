import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {copyFile, mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path/posix";
import type {DuckDBConfig} from "./config.js";
import {faint} from "./tty.js";

const downloadRequests = new Map<string, Promise<string>>();

export async function duckDBManifest(duckdb: DuckDBConfig, {root, log}: {root: string; log?: boolean}) {
  return {
    log,
    extensions: await Promise.all(
      duckdb.install.map(async (name) => [
        name,
        {
          ref: await resolveDuckDBExtension(root, duckdb, name),
          load: duckdb.load.includes(name)
        }
      ])
    )
  };
}

/**
 * Given a URL such as
 * https://extensions.duckdb.org/v1.1.1/wasm_eh/parquet.duckdb_extension.wasm,
 * saves the file to _duckdb/{hash}/v1.1.1/wasm_eh/parquet.duckdb_extension.wasm
 * and returns _duckdb/{hash} for DuckDB to INSTALL.
 */
export async function resolveDuckDBExtension(root: string, duckdb: DuckDBConfig, name: string): Promise<string> {
  const repo = duckdb.from[name];
  if (!repo.startsWith("https://")) throw new Error(`invalid repo: ${repo}`);
  const href = `${repo}/v1.1.1/wasm_eh/${name}.duckdb_extension.wasm`;
  const {host, pathname} = new URL(href);
  const cache = join(root, ".observablehq", "cache");
  const outputPath = join(cache, host, pathname);
  if (existsSync(outputPath)) return duckDBHash(outputPath, cache, pathname);
  let promise = downloadRequests.get(outputPath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    console.log(`download: ${href} ${faint("→")} ${outputPath}`);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    await mkdir(dirname(outputPath), {recursive: true});
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    return duckDBHash(outputPath, cache, pathname);
  })();
  promise.catch(console.error).then(() => downloadRequests.delete(outputPath));
  downloadRequests.set(outputPath, promise);
  return promise;
}

async function duckDBHash(outputPath: string, cache: string, extension: string): Promise<string> {
  const contents = await readFile(outputPath, "utf-8");
  const dir = join("_duckdb", createHash("sha256").update(contents).digest("hex").slice(0, 8));
  const targetPath = join(cache, dir, extension);
  await mkdir(dirname(targetPath), {recursive: true});
  await copyFile(outputPath, targetPath);
  return join(dir, extension);
}
