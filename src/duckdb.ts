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
 * Given a duckdb configuration and an extension name such as "parquet", saves
 * the binary to _duckdb/{hash}/v1.1.1/wasm_{p}/parquet.duckdb_extension.wasm
 * for every supported platform p ("eh" and "mvp"), and returns a content-hashed
 * reference (_duckdb/{hash}) to use in the corresponding DuckDB INSTALL
 * statement. The repo is structured as required by DuckDB with:
 * ${repo}/v1.1.1/wasm_{p}/${name}.duckdb_extension.wasm
 */
export async function resolveDuckDBExtension(root: string, duckdb: DuckDBConfig, name: string): Promise<string> {
  const platforms = ["eh", "mvp"];
  const repo = duckdb.source[name];
  if (!repo.startsWith("https://")) throw new Error(`invalid repo: ${repo}`);
  const {host} = new URL(repo);
  const cache = join(root, ".observablehq", "cache");
  const outputDir = join(cache, "duckdb", host);
  const files = ["eh", "mvp"].map((p) => join(outputDir, `${name}.${p}.wasm`));
  if (files.every(existsSync)) {
    const ref = await duckDBHash(files);
    if (platforms.every((p) => existsSync(join(cache, ref, "v1.1.1", `wasm_${p}`, `${name}.duckdb_extension.wasm`))))
      return ref;
  }
  const key = join(outputDir, name);
  let promise = downloadRequests.get(key);
  if (promise) return promise; // coalesce concurrent requests
  promise = Promise.all(
    platforms.map(async (p) => {
      const href = `${repo}/v1.1.1/wasm_${p}/${name}.duckdb_extension.wasm`;
      const outputPath = join(outputDir, `${name}.${p}.wasm`);
      console.log(`download: ${href} ${faint("→")} ${outputPath}`);
      const response = await fetch(href);
      if (!response.ok) throw new Error(`unable to fetch: ${href}`);
      await mkdir(dirname(outputPath), {recursive: true});
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    })
  ).then(async () => {
    const ref = await duckDBHash(files);
    for (const [i, p] of platforms.entries()) {
      const targetPath = join(cache, ref, "v1.1.1", `wasm_${p}`, `${name}.duckdb_extension.wasm`);
      await mkdir(dirname(targetPath), {recursive: true});
      await copyFile(files[i], targetPath);
    }
    return ref;
  });
  promise.catch(console.error).then(() => files.forEach((file) => downloadRequests.delete(file)));
  downloadRequests.set(key, promise);
  return promise;
}

async function duckDBHash(files: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const file of files) hash.update(await readFile(file, "utf-8"));
  return join("_duckdb", hash.digest("hex").slice(0, 8));
}
