import {existsSync} from "node:fs";
import {mkdir, readFile, readdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {Parser} from "acorn";
import {simple} from "acorn-walk";
import {gt, satisfies} from "semver";
import {parseOptions} from "../javascript.js";
import {relativePath} from "../path.js";
import {Sourcemap} from "../sourcemap.js";
import {faint} from "../tty.js";
import type {ExportNode, ImportNode, ImportReference} from "./imports.js";
import {findImports} from "./imports.js";
import {getStringLiteralValue, isStringLiteral} from "./node.js";

export interface NpmSpecifier {
  name: string;
  range?: string;
  path?: string;
}

export function parseNpmSpecifier(specifier: string): NpmSpecifier {
  const parts = specifier.split("/");
  const namerange = specifier.startsWith("@") ? [parts.shift()!, parts.shift()!].join("/") : parts.shift()!;
  const ranged = namerange.indexOf("@", 1);
  return {
    name: ranged > 0 ? namerange.slice(0, ranged) : namerange,
    range: ranged > 0 ? namerange.slice(ranged + 1) : undefined,
    path: parts.length > 0 ? parts.join("/") : undefined
  };
}

export function formatNpmSpecifier({name, range, path}: NpmSpecifier): string {
  return `${name}${range ? `@${range}` : ""}${path ? `/${path}` : ""}`;
}

// Like import, don’t fetch the same package more than once to ensure
// consistency; restart the server if you want to clear the cache.
const fetchCache = new Map<string, Promise<{headers: Headers; body: any}>>();

async function cachedFetch(href: string): Promise<{headers: Headers; body: any}> {
  let promise = fetchCache.get(href);
  if (promise) return promise;
  promise = (async () => {
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    const json = /^application\/json(;|$)/.test(response.headers.get("content-type")!);
    const body = await (json ? response.json() : response.text());
    return {headers: response.headers, body};
  })();
  promise.catch(() => fetchCache.delete(href)); // try again on error
  fetchCache.set(href, promise);
  return promise;
}

/** Rewrites /npm/ import specifiers to be relative paths to /_npm/. */
export function rewriteNpmImports(input: string, path: string): string {
  const body = Parser.parse(input, parseOptions);
  const output = new Sourcemap(input);

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    if (node.source && isStringLiteral(node.source)) {
      let value = getStringLiteralValue(node.source);
      if (value.startsWith("/npm/")) {
        value = `/_npm/${value.slice("/npm/".length)}`;
        if (value.endsWith("/+esm")) value += ".js";
        value = relativePath(path, value);
        output.replaceLeft(node.source.start, node.source.end, JSON.stringify(value));
      }
    }
  }

  // TODO Preserve the source map, but download it too.
  return String(output).replace(/^\/\/# sourceMappingURL=.*$\n?/m, "");
}

const npmRequests = new Map<string, Promise<string>>();

/** Note: path must start with "/_npm/". */
export async function populateNpmCache(root: string, path: string): Promise<string> {
  if (!path.startsWith("/_npm/")) throw new Error(`invalid npm path: ${path}`);
  const filePath = join(root, ".observablehq", "cache", path);
  if (existsSync(filePath)) return filePath;
  let promise = npmRequests.get(path);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async function () {
    const specifier = path.slice("/_npm/".length).replace(/\/\+esm\.js$/, "/+esm");
    const href = `https://cdn.jsdelivr.net/npm/${specifier}`;
    process.stdout.write(`npm:${specifier} ${faint("→")} `);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    process.stdout.write(`${filePath}\n`);
    await mkdir(dirname(filePath), {recursive: true});
    if (/^application\/javascript(;|$)/i.test(response.headers.get("content-type")!)) {
      await writeFile(filePath, rewriteNpmImports(await response.text(), path), "utf-8");
    } else {
      await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    }
    return filePath;
  })();
  promise.catch(() => {}).then(() => npmRequests.delete(path));
  npmRequests.set(path, promise);
  return promise;
}

export async function findCachedNpmVersion(root: string, specifier: NpmSpecifier): Promise<string | undefined> {
  let dir = join(root, ".observablehq", "cache", "_npm");
  let latestVersion: string | undefined;
  if (specifier.name.startsWith("@")) {
    const [scope] = specifier.name.split("/");
    dir = join(dir, scope);
    if (existsSync(dir)) {
      for (const entry of await readdir(dir)) {
        const version = maybeSatisfyingVersion(`${scope}/${entry}`, specifier);
        if (version && (!latestVersion || gt(version, latestVersion))) latestVersion = version;
      }
    }
  } else {
    if (existsSync(dir)) {
      for (const entry of await readdir(dir)) {
        const version = maybeSatisfyingVersion(entry, specifier);
        if (version && (!latestVersion || gt(version, latestVersion))) latestVersion = version;
      }
    }
  }
  return latestVersion;
}

function maybeSatisfyingVersion(entry: string, specifier: NpmSpecifier): string | undefined {
  const {name, range} = parseNpmSpecifier(entry);
  if (range && name === specifier.name && (!specifier.range || satisfies(range, specifier.range))) return range;
}

async function resolveNpmVersion(root: string, specifier: NpmSpecifier): Promise<string> {
  const {name, range} = specifier;
  if (range && /^\d+\.\d+\.\d+([-+].*)?$/.test(range)) return range; // exact version specified
  const cachedVersion = await findCachedNpmVersion(root, specifier);
  if (cachedVersion) return cachedVersion;
  const search = range ? `?specifier=${range}` : "";
  const {version} = (await cachedFetch(`https://data.jsdelivr.com/v1/packages/npm/${name}/resolved${search}`)).body;
  if (!version) throw new Error(`unable to resolve version: ${formatNpmSpecifier({name, range})}`);
  return version;
}

export async function resolveNpmImport(root: string, specifier: string): Promise<string> {
  let {name, range, path = "+esm"} = parseNpmSpecifier(specifier); // eslint-disable-line prefer-const
  if (name === "@duckdb/duckdb-wasm" && !range) range = "1.28.0"; // https://github.com/duckdb/duckdb-wasm/issues/1561
  if (name === "apache-arrow" && !range) range = "13.0.0"; // https://github.com/observablehq/framework/issues/750
  if (name === "parquet-wasm" && !range) range = "0.5.0"; // https://github.com/observablehq/framework/issues/733
  if (name === "echarts" && !range) range = "5.4.3"; // https://github.com/observablehq/framework/pull/811
  try {
    return `/_npm/${name}@${await resolveNpmVersion(root, {name, range})}/${path.replace(/\+esm$/, "+esm.js")}`;
  } catch {
    return `https://cdn.jsdelivr.net/npm/${name}${range ? `@${range}` : ""}/${path}`;
  }
}

const npmImportsCache = new Map<string, Promise<ImportReference[]>>();

/**
 * Resolves the direct dependencies of the specified npm path, such as
 * "/_npm/d3@7.8.5/+esm.js", returning the corresponding set of npm paths.
 *
 * TODO Investigate why "npm:mermaid" imports broken links to
 * "./dist/c4Diagram-b947cdbb.js/+esm.js". Should that "/+esm.js" be there? (And
 * in any case these are dynamic imports that we don’t want to preload, but that
 * we probably should attempt to download. Maybe that means we need a way to
 * suppress downloads that you don’t want, too? Or perhaps a way to list all of
 * the files that you want, and we’ll use that if present instead of trying to
 * download whatever we think you need.)
 */
export async function resolveNpmImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_npm/")) throw new Error(`invalid npm path: ${path}`);
  let promise = npmImportsCache.get(path);
  if (promise) return promise;
  promise = (async function () {
    try {
      const filePath = await populateNpmCache(root, path);
      const source = await readFile(filePath, "utf-8");
      const body = Parser.parse(source, parseOptions); // TODO await parseModule?
      return findImports(body, path, source);
    } catch (error) {
      console.warn(`unable to fetch or parse: ${path}`);
      return [];
    }
  })();
  npmImportsCache.set(path, promise);
  return promise;
}
