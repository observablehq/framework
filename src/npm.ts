import {existsSync} from "node:fs";
import {mkdir, readFile, readdir, writeFile} from "node:fs/promises";
import {dirname, extname, join} from "node:path/posix";
import type {CallExpression} from "acorn";
import {simple} from "acorn-walk";
import {maxSatisfying, rsort, satisfies, validRange} from "semver";
import {DUCKDBWASMVERSION} from "./duckdb.js";
import {isEnoent} from "./error.js";
import type {ExportNode, ImportNode, ImportReference} from "./javascript/imports.js";
import {isImportMetaResolve, parseImports} from "./javascript/imports.js";
import {parseProgram} from "./javascript/parse.js";
import type {StringLiteral} from "./javascript/source.js";
import {getStringLiteralValue, isStringLiteral} from "./javascript/source.js";
import {relativePath} from "./path.js";
import {Sourcemap} from "./sourcemap.js";
import {faint, yellow} from "./tty.js";

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

/** Rewrites /npm/ import specifiers to be relative paths to /_npm/. */
export function rewriteNpmImports(input: string, resolve: (s: string) => string | void = () => undefined): string {
  const body = parseProgram(input);
  const output = new Sourcemap(input);

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport,
    CallExpression: rewriteImportMetaResolve
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    if (node.source && isStringLiteral(node.source)) {
      rewriteImportSource(node.source);
    }
  }

  function rewriteImportMetaResolve(node: CallExpression) {
    if (isImportMetaResolve(node) && isStringLiteral(node.arguments[0])) {
      rewriteImportSource(node.arguments[0]);
    }
  }

  function rewriteImportSource(source: StringLiteral) {
    const value = getStringLiteralValue(source);
    const resolved = resolve(value);
    if (resolved === undefined || value === resolved) return;
    output.replaceLeft(source.start, source.end, JSON.stringify(resolved));
  }

  // TODO Preserve the source map, but download it too.
  return String(output).replace(/^\/\/# sourceMappingURL=.*$\n?/m, "");
}

const npmRequests = new Map<string, Promise<string>>();

/** Note: path must start with "/_npm/". */
export async function populateNpmCache(root: string, path: string): Promise<string> {
  if (!path.startsWith("/_npm/")) throw new Error(`invalid npm path: ${path}`);
  const outputPath = join(root, ".observablehq", "cache", path);
  if (existsSync(outputPath)) return outputPath;
  let promise = npmRequests.get(outputPath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    const specifier = extractNpmSpecifier(path);
    const href = `https://cdn.jsdelivr.net/npm/${specifier}`;
    console.log(`npm:${specifier} ${faint("→")} ${outputPath}`);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    await mkdir(dirname(outputPath), {recursive: true});
    if (/^application\/javascript(;|$)/i.test(response.headers.get("content-type")!)) {
      const source = await response.text();
      const resolver = await getDependencyResolver(root, path, source);
      await writeFile(outputPath, rewriteNpmImports(source, resolver), "utf-8");
    } else {
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    }
    return outputPath;
  })();
  promise.catch(console.error).then(() => npmRequests.delete(outputPath));
  npmRequests.set(outputPath, promise);
  return promise;
}

/**
 * Returns an import resolver for rewriting an npm module from jsDelivr,
 * replacing /npm/ import specifiers with relative paths, and re-resolving
 * versions against the module’s package.json file. (jsDeliver bakes-in the
 * exact version the first time a module is built and doesn’t update it when a
 * new version of a dependency is published; we always want to import the latest
 * version to ensure that we don’t load duplicate copies of transitive
 * dependencies at different versions.)
 */
export async function getDependencyResolver(
  root: string,
  path: string,
  input: string
): Promise<(specifier: string) => string> {
  const body = parseProgram(input);
  const dependencies = new Set<string>();
  const {name, range} = parseNpmSpecifier(extractNpmSpecifier(path));

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    ExportAllDeclaration: findImport,
    ExportNamedDeclaration: findImport,
    CallExpression: findImportMetaResolve
  });

  function findImport(node: ImportNode | ExportNode) {
    if (node.source && isStringLiteral(node.source)) {
      findImportSource(node.source);
    }
  }

  function findImportMetaResolve(node: CallExpression) {
    if (isImportMetaResolve(node) && isStringLiteral(node.arguments[0])) {
      findImportSource(node.arguments[0]);
    }
  }

  function findImportSource(source: StringLiteral) {
    const value = getStringLiteralValue(source);
    if (value.startsWith("/npm/")) {
      const {name: depName, range: depRange} = parseNpmSpecifier(value.slice("/npm/".length));
      if (depName === name) return; // ignore self-references, e.g. mermaid plugin
      if (depRange && existsSync(join(root, ".observablehq", "cache", "_npm", `${depName}@${depRange}`))) return; // already resolved
      dependencies.add(value);
    }
  }

  const resolutions = new Map<string, string>();

  // If there are dependencies to resolve, load the package.json and use the semver
  // range there instead of the (stale) resolution that jsDelivr provides.
  if (dependencies.size > 0) {
    const pkgPath = await populateNpmCache(root, `/_npm/${name}@${range}/package.json`);
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    for (const dependency of dependencies) {
      const {name: depName, path: depPath = "+esm"} = parseNpmSpecifier(dependency.slice("/npm/".length));
      const range =
        (name === "arquero" || name === "@uwdata/mosaic-core" || name === "@duckdb/duckdb-wasm") && depName === "apache-arrow" // prettier-ignore
          ? "latest" // force Arquero, Mosaic & DuckDB-Wasm to use the (same) latest version of Arrow
          : name === "@uwdata/mosaic-core" && depName === "@duckdb/duckdb-wasm"
          ? DUCKDBWASMVERSION // force Mosaic to use the latest (stable) version of DuckDB-Wasm
          : pkg.dependencies?.[depName] ??
            pkg.devDependencies?.[depName] ??
            pkg.peerDependencies?.[depName] ??
            void console.warn(yellow(`${depName} is an undeclared dependency of ${name}; resolving latest version`));
      resolutions.set(dependency, await resolveNpmImport(root, `${depName}${range ? `@${range}` : ""}/${depPath}`));
    }
  }

  return (specifier: string) => {
    if (!specifier.startsWith("/npm/")) return specifier;
    if (resolutions.has(specifier)) specifier = resolutions.get(specifier)!;
    else specifier = fromJsDelivrPath(specifier);
    return relativePath(path, specifier);
  };
}

export async function initializeNpmVersionCache(root: string, dir = "_npm"): Promise<Map<string, string[]>> {
  const cache = new Map<string, string[]>();
  const cacheDir = join(root, ".observablehq", "cache", dir);
  try {
    for (const entry of await readdir(cacheDir)) {
      if (entry.startsWith("@")) {
        for (const subentry of await readdir(join(cacheDir, entry))) {
          const {name, range} = parseNpmSpecifier(`${entry}/${subentry}`);
          const versions = cache.get(name);
          if (versions) versions.push(range!);
          else cache.set(name, [range!]);
        }
      } else {
        const {name, range} = parseNpmSpecifier(entry);
        const versions = cache.get(name);
        if (versions) versions.push(range!);
        else cache.set(name, [range!]);
      }
    }
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  for (const [key, value] of cache) {
    cache.set(key, rsort(value));
  }
  return cache;
}

const npmVersionCaches = new Map<string, Promise<Map<string, string[]>>>();
const npmVersionRequests = new Map<string, Promise<string>>();

function getNpmVersionCache(root: string): Promise<Map<string, string[]>> {
  let cache = npmVersionCaches.get(root);
  if (!cache) npmVersionCaches.set(root, (cache = initializeNpmVersionCache(root, "_npm")));
  return cache;
}

async function resolveNpmVersion(root: string, {name, range}: NpmSpecifier): Promise<string> {
  if (range && /^\d+\.\d+\.\d+([-+].*)?$/.test(range)) return range; // exact version specified
  const cache = await getNpmVersionCache(root);
  const versions = cache.get(name);
  if (versions) for (const version of versions) if (!range || satisfies(version, range)) return version;
  if (range === undefined) range = "latest";
  const disttag = validRange(range) ? null : range;
  const href = `https://registry.npmjs.org/${name}${disttag ? `/${disttag}` : ""}`;
  let promise = npmVersionRequests.get(href);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async function () {
    const input = formatNpmSpecifier({name, range});
    process.stdout.write(`npm:${input} ${faint("→")} `);
    const response = await fetch(href, {...(!disttag && {headers: {Accept: "application/vnd.npm.install-v1+json"}})});
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    const body = await response.json();
    const version = disttag ? body.version : maxSatisfying(Object.keys(body.versions), range);
    if (!version) throw new Error(`unable to resolve version: ${input}`);
    const output = formatNpmSpecifier({name, range: version});
    process.stdout.write(`npm:${output}\n`);
    cache.set(name, versions ? rsort(versions.concat(version)) : [version]);
    mkdir(join(root, ".observablehq", "cache", "_npm", output), {recursive: true}); // disk cache
    return version;
  })();
  promise.catch(console.error).then(() => npmVersionRequests.delete(href));
  npmVersionRequests.set(href, promise);
  return promise;
}

export async function resolveNpmImport(root: string, specifier: string): Promise<string> {
  const {
    name,
    range = name === "@duckdb/duckdb-wasm" ? DUCKDBWASMVERSION : undefined,
    path = name === "mermaid"
      ? "dist/mermaid.esm.min.mjs/+esm"
      : name === "echarts"
      ? "dist/echarts.esm.min.js/+esm"
      : name === "jquery-ui"
      ? "dist/jquery-ui.js/+esm"
      : name === "deck.gl"
      ? "dist.min.js/+esm"
      : "+esm"
  } = parseNpmSpecifier(specifier);
  const version = await resolveNpmVersion(root, {name, range});
  return `/_npm/${name}@${version}/${
    extname(path) || // npm:foo/bar.js or npm:foo/bar.css
    path === "" || // npm:foo/
    path.endsWith("/") // npm:foo/bar/
      ? path
      : path === "+esm" // npm:foo/+esm
      ? "_esm.js"
      : path.replace(/(?:\/\+esm)?$/, "._esm.js") // npm:foo/bar or npm:foo/bar/+esm
  }`;
}

/**
 * Resolves the direct dependencies of the specified npm path, such as
 * "/_npm/d3@7.8.5/_esm.js", returning the corresponding set of npm paths.
 */
export async function resolveNpmImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_npm/")) throw new Error(`invalid npm path: ${path}`);
  await populateNpmCache(root, path);
  return parseImports(join(root, ".observablehq", "cache"), path);
}

/**
 * Given a local npm path such as "/_npm/d3@7.8.5/_esm.js", returns the
 * corresponding npm specifier such as "d3@7.8.5/+esm". For example:
 *
 * /_npm/mime@4.0.1/_esm.js         → mime@4.0.1/+esm
 * /_npm/mime@4.0.1/lite._esm.js    → mime@4.0.1/lite/+esm
 * /_npm/mime@4.0.1/lite.js._esm.js → mime@4.0.1/lite.js/+esm
 */
export function extractNpmSpecifier(path: string): string {
  if (!path.startsWith("/_npm/")) throw new Error(`invalid npm path: ${path}`);
  const parts = path.split("/"); // ["", "_npm", "mime@4.0.1", "lite.js._esm.js"]
  const i = parts[2].startsWith("@") ? 4 : 3; // test for scoped package
  const namever = parts.slice(2, i).join("/"); // "mime@4.0.1" or "@observablehq/inputs@0.10.6"
  const subpath = parts.slice(i).join("/"); // "_esm.js" or "lite._esm.js" or "lite.js._esm.js"
  return `${namever}/${subpath === "_esm.js" ? "+esm" : subpath.replace(/\._esm\.js$/, "/+esm")}`;
}

/**
 * Given a jsDelivr path such as "/npm/d3@7.8.5/+esm", returns the corresponding
 * local path such as "/_npm/d3@7.8.5/_esm.js". For example:
 *
 * /npm/mime@4.0.1/+esm         → /_npm/mime@4.0.1/_esm.js
 * /npm/mime@4.0.1/lite/+esm    → /_npm/mime@4.0.1/lite._esm.js
 * /npm/mime@4.0.1/lite.js/+esm → /_npm/mime@4.0.1/lite.js._esm.js
 */
export function fromJsDelivrPath(path: string): string {
  if (!path.startsWith("/npm/")) throw new Error(`invalid jsDelivr path: ${path}`);
  const parts = path.split("/"); // e.g. ["", "npm", "mime@4.0.1", "lite", "+esm"]
  const i = parts[2].startsWith("@") ? 4 : 3; // test for scoped package
  const namever = parts.slice(2, i).join("/"); // "mime@4.0.1" or "@observablehq/inputs@0.10.6"
  const subpath = parts.slice(i).join("/"); // "+esm" or "lite/+esm" or "lite.js/+esm"
  return `/_npm/${namever}/${subpath === "+esm" ? "_esm.js" : subpath.replace(/\/\+esm$/, "._esm.js")}`;
}
