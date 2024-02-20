import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {mkdir, readdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {Parser} from "acorn";
import type {Identifier, Node, Program} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {gt, satisfies} from "semver";
import {getConfig} from "../config.js";
import {isEnoent} from "../error.js";
import {type Feature, type ImportReference, type JavaScriptNode} from "../javascript.js";
import {parseOptions} from "../javascript.js";
import {Sourcemap} from "../sourcemap.js";
import {faint} from "../tty.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getFeature, getFeatureReferenceMap, getStringLiteralValue, isStringLiteral} from "./features.js";

type ImportNode = ImportDeclaration | ImportExpression;
type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

export interface ImportsAndFeatures {
  imports: ImportReference[];
  features: Feature[];
}

/**
 * Finds all export declarations in the specified node. (This is used to
 * disallow exports within JavaScript code blocks.)
 */
export function findExports(body: Node): ExportNode[] {
  const exports: ExportNode[] = [];

  simple(body, {
    ExportAllDeclaration: findExport,
    ExportNamedDeclaration: findExport
  });

  function findExport(node: ExportNode) {
    exports.push(node);
  }

  return exports;
}

/**
 * Finds all imports (both static and dynamic) in the specified node.
 * Recursively processes any imported local ES modules. The returned transitive
 * import paths are relative to the given source path.
 */
export function findImports(body: Node, root: string, path: string): ImportsAndFeatures {
  const imports: ImportReference[] = [];
  const features: Feature[] = [];
  const paths: string[] = [];

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport
  });

  function findImport(node: ImportNode) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        paths.push(resolvePath(path, decodeURIComponent(value)));
      } else {
        imports.push({name: value, type: "global"});
      }
    }
  }

  // Recursively process any imported local ES modules.
  const transitive = parseLocalImports(root, paths);
  imports.push(...transitive.imports);
  features.push(...transitive.features);

  // Make all local paths relative to the source path.
  for (const i of imports) {
    if (i.type === "local") {
      i.name = relativeUrl(path, i.name);
    }
  }

  return {imports, features};
}

/**
 * Parses the module at the specified path to find transitive imports,
 * processing imported modules recursively. Accumulates visited paths, and
 * appends to imports. The paths here are always relative to the root (unlike
 * findImports above!).
 */
export function parseLocalImports(root: string, paths: string[]): ImportsAndFeatures {
  const imports: ImportReference[] = [];
  const features: Feature[] = [];
  const set = new Set(paths);

  for (const path of set) {
    imports.push({type: "local", name: path});
    try {
      const input = readFileSync(join(root, path), "utf-8");
      const body = Parser.parse(input, parseOptions);

      simple(
        body,
        {
          ImportDeclaration: findImport,
          ImportExpression: findImport,
          ExportAllDeclaration: findImport,
          ExportNamedDeclaration: findImport
        },
        undefined,
        path
      );

      features.push(...findImportFeatures(body, path, input));
    } catch (error) {
      if (!isEnoent(error) && !(error instanceof SyntaxError)) throw error;
    }
  }

  function findImport(node: ImportNode | ExportNode, path: string) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        set.add(resolvePath(path, value));
      } else {
        imports.push({name: value, type: "global"});
        // non-local imports don't need to be traversed
      }
    }
  }

  return {imports, features};
}

export function findImportFeatures(node: Node, path: string, input: string): Feature[] {
  const featureMap = getFeatureReferenceMap(node);
  const features: Feature[] = [];

  simple(node, {
    CallExpression(node) {
      const type = featureMap.get(node.callee as Identifier);
      if (type) features.push(getFeature(type, node, path, input));
    }
  });

  return features;
}

/** Rewrites import specifiers and FileAttachment calls in the specified ES module source. */
export async function rewriteModule(input: string, path: string, resolver: ImportResolver): Promise<string> {
  const body = Parser.parse(input, parseOptions);
  const featureMap = getFeatureReferenceMap(body);
  const output = new Sourcemap(input);
  const imports: (ImportNode | ExportNode)[] = [];

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport,
    CallExpression(node) {
      const type = featureMap.get(node.callee as Identifier);
      if (type) {
        const feature = getFeature(type, node, path, input); // validate syntax
        if (feature.type === "FileAttachment") {
          const arg = node.arguments[0];
          const result = JSON.stringify(relativeUrl(join("_import", path), feature.name));
          output.replaceLeft(arg.start, arg.end, `${result}, import.meta.url`);
        }
      }
    }
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    imports.push(node);
  }

  for (const node of imports) {
    if (isStringLiteral(node.source)) {
      output.replaceLeft(
        node.source.start,
        node.source.end,
        JSON.stringify(await resolver(path, getStringLiteralValue(node.source)))
      );
    }
  }

  return String(output);
}

export function findImportDeclarations(cell: JavaScriptNode): ImportDeclaration[] {
  const declarations: ImportDeclaration[] = [];

  simple(cell.body, {
    ImportDeclaration(node) {
      if (isStringLiteral(node.source)) {
        declarations.push(node);
      }
    }
  });

  return declarations;
}

/**
 * Rewrites import specifiers in the specified JavaScript fenced code block or
 * inline expression.
 */
export async function rewriteImports(
  output: Sourcemap,
  cell: JavaScriptNode,
  sourcePath: string,
  resolver: ImportResolver
): Promise<void> {
  const expressions: ImportExpression[] = [];
  const declarations: ImportDeclaration[] = [];

  simple(cell.body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        expressions.push(node);
      }
    },
    ImportDeclaration(node) {
      if (isStringLiteral(node.source)) {
        declarations.push(node);
      }
    }
  });

  for (const node of expressions) {
    output.replaceLeft(
      node.source.start,
      node.source.end,
      JSON.stringify(await resolver(sourcePath, getStringLiteralValue(node.source)))
    );
  }

  const specifiers: string[] = [];
  const imports: string[] = [];
  for (const node of declarations) {
    output.delete(node.start, node.end + +(output.input[node.end] === "\n"));
    specifiers.push(
      node.specifiers.some(isNotNamespaceSpecifier)
        ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
        : node.specifiers.find(isNamespaceSpecifier)?.local.name ?? "{}"
    );
    imports.push(`import(${JSON.stringify(await resolver(sourcePath, getStringLiteralValue(node.source)))})`);
  }

  if (declarations.length > 1) {
    output.insertLeft(0, `const [${specifiers.join(", ")}] = await Promise.all([${imports.join(", ")}]);\n`);
  } else if (declarations.length === 1) {
    output.insertLeft(0, `const ${specifiers[0]} = await ${imports[0]};\n`);
  }
}

export type ImportResolver = (path: string, specifier: string) => Promise<string>;

export function createImportResolver(root: string, base: "." | "_import" = "."): ImportResolver {
  return async (path, specifier) => {
    return isLocalImport(specifier, path)
      ? relativeUrl(path, resolvePath(base, path, resolveImportHash(root, path, specifier)))
      : specifier === "npm:@observablehq/runtime"
      ? resolveBuiltin(base, path, "runtime.js")
      : specifier === "npm:@observablehq/stdlib"
      ? resolveBuiltin(base, path, "stdlib.js")
      : specifier === "npm:@observablehq/dot"
      ? resolveBuiltin(base, path, "stdlib/dot.js") // TODO publish to npm
      : specifier === "npm:@observablehq/duckdb"
      ? resolveBuiltin(base, path, "stdlib/duckdb.js") // TODO publish to npm
      : specifier === "npm:@observablehq/inputs"
      ? resolveBuiltin(base, path, "stdlib/inputs.js") // TODO publish to npm
      : specifier === "npm:@observablehq/mermaid"
      ? resolveBuiltin(base, path, "stdlib/mermaid.js") // TODO publish to npm
      : specifier === "npm:@observablehq/tex"
      ? resolveBuiltin(base, path, "stdlib/tex.js") // TODO publish to npm
      : specifier === "npm:@observablehq/sqlite"
      ? resolveBuiltin(base, path, "stdlib/sqlite.js") // TODO publish to npm
      : specifier === "npm:@observablehq/xlsx"
      ? resolveBuiltin(base, path, "stdlib/xlsx.js") // TODO publish to npm
      : specifier === "npm:@observablehq/zip"
      ? resolveBuiltin(base, path, "stdlib/zip.js") // TODO publish to npm
      : specifier.startsWith("npm:")
      ? relativeUrl(path, await resolveNpmImport(specifier.slice("npm:".length)))
      : specifier;
  };
}

interface NpmSpecifier {
  name: string;
  range?: string;
  path?: string;
}

function parseNpmSpecifier(specifier: string): NpmSpecifier {
  const parts = specifier.split("/");
  const namerange = specifier.startsWith("@") ? [parts.shift()!, parts.shift()!].join("/") : parts.shift()!;
  const ranged = namerange.indexOf("@", 1);
  return {
    name: ranged > 0 ? namerange.slice(0, ranged) : namerange,
    range: ranged > 0 ? namerange.slice(ranged + 1) : undefined,
    path: parts.length > 0 ? parts.join("/") : undefined
  };
}

function formatNpmSpecifier({name, range, path}: NpmSpecifier): string {
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
    if (isStringLiteral(node.source)) {
      let value = getStringLiteralValue(node.source);
      if (value.startsWith("/npm/")) {
        value = `/_npm/${value.slice("/npm/".length)}`;
        if (value.endsWith("/+esm")) value += ".js";
        value = relativeUrl(path, value);
        output.replaceLeft(node.source.start, node.source.end, JSON.stringify(value));
      }
    }
  }

  // TODO Preserve the source map, but download it too.
  return String(output).replace(/^\/\/# sourceMappingURL=.*$\n?/m, "");
}

const npmRequests = new Map<string, Promise<void>>();

export function populateNpmCache(npmDir: string, path: string): Promise<void> {
  const filePath = join(npmDir, path);
  if (existsSync(filePath)) return Promise.resolve();
  let promise = npmRequests.get(path);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async function () {
    const href = `https://cdn.jsdelivr.net/npm/${path.replace(/\+esm\.js$/, "+esm")}`;
    process.stdout.write(`npm:${path} ${faint("→")} `);
    const response = await fetch(href);
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    process.stdout.write(`${filePath}\n`);
    await mkdir(dirname(filePath), {recursive: true});
    if (/^application\/javascript(;|$)/i.test(response.headers.get("content-type")!)) {
      const servePath = `/_npm/${path}`;
      await writeFile(filePath, rewriteNpmImports(await response.text(), servePath), "utf-8");
    } else {
      await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    }
  })();
  promise.finally(() => npmRequests.delete(path));
  npmRequests.set(path, promise);
  return promise;
}

export async function findCachedNpmVersion(specifier: NpmSpecifier): Promise<string | undefined> {
  const {root} = getConfig();
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

async function resolveNpmVersion(specifier: NpmSpecifier): Promise<string> {
  const {name, range} = specifier;
  if (range && /^\d+\.\d+\.\d+([-+].*)?$/.test(range)) return range; // exact version specified
  const cachedVersion = await findCachedNpmVersion(specifier);
  if (cachedVersion) return cachedVersion;
  const search = range ? `?specifier=${range}` : "";
  const {version} = (await cachedFetch(`https://data.jsdelivr.com/v1/packages/npm/${name}/resolved${search}`)).body;
  if (!version) throw new Error(`unable to resolve version: ${formatNpmSpecifier({name, range})}`);
  return version;
}

export async function resolveNpmImport(specifier: string): Promise<string> {
  let {name, range, path = "+esm"} = parseNpmSpecifier(specifier); // eslint-disable-line prefer-const
  if (name === "@duckdb/duckdb-wasm" && !range) range = "1.28.0"; // https://github.com/duckdb/duckdb-wasm/issues/1561
  if (name === "apache-arrow" && !range) range = "13.0.0"; // https://github.com/observablehq/framework/issues/750
  if (name === "parquet-wasm" && !range) range = "0.5.0"; // https://github.com/observablehq/framework/issues/733
  if (name === "echarts" && !range) range = "5.4.3"; // https://github.com/observablehq/framework/pull/811
  try {
    return `/_npm/${name}@${await resolveNpmVersion({name, range})}/${path.replace(/\+esm$/, "+esm.js")}`;
  } catch {
    return `https://cdn.jsdelivr.net/npm/${name}${range ? `@${range}` : ""}/${path}`;
  }
}

const preloadCache = new Map<string, Promise<Set<string> | undefined>>();

/**
 * Fetches the module at the specified URL and returns a promise to any
 * transitive modules it imports (on the same host; only path-based imports are
 * considered), as well as its subresource integrity hash. Only static imports
 * are considered, and the fetched module must be have immutable public caching;
 * dynamic imports may not be used and hence are not preloaded.
 */
async function fetchModulePreloads(href: string): Promise<Set<string> | undefined> {
  let promise = preloadCache.get(href);
  if (promise) return promise;
  promise = (async () => {
    let response: {headers: any; body: any};
    try {
      response = await cachedFetch(href);
    } catch {
      return;
    }
    const {headers, body} = response;
    const cache = headers.get("cache-control")?.split(/\s*,\s*/);
    if (!cache?.some((c) => c === "immutable") || !cache?.some((c) => c === "public")) return;
    const imports = new Set<string>();
    let program: Program;
    try {
      program = Parser.parse(body, parseOptions);
    } catch (error) {
      if (!isEnoent(error) && !(error instanceof SyntaxError)) throw error;
      return;
    }
    simple(program, {
      ImportDeclaration: findImport,
      ExportAllDeclaration: findImport,
      ExportNamedDeclaration: findImport
    });
    function findImport(node: ImportNode | ExportNode) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        if (isPathImport(value)) imports.add(String(new URL(value, href)));
      }
    }
    // TODO integrityCache.set(href, `sha384-${createHash("sha384").update(body).digest("base64")}`);
    return imports;
  })();
  promise.catch(() => preloadCache.delete(href)); // try again on error
  preloadCache.set(href, promise);
  return promise;
}

const integrityCache = new Map<string, string>();

/**
 * Given a set of resolved module specifiers (URLs) to preload, fetches any
 * externally-hosted modules to compute the transitively-imported modules; also
 * precomputes the subresource integrity hash for each fetched module.
 */
export async function resolveModulePreloads(hrefs: Set<string>): Promise<void> {
  let resolve: () => void;
  const visited = new Set<string>();
  const queue = new Set<Promise<void>>();

  for (const href of hrefs) {
    if (href.startsWith("https:")) {
      enqueue(href);
    }
  }

  function enqueue(href: string) {
    if (visited.has(href)) return;
    visited.add(href);
    const promise = (async () => {
      const imports = await fetchModulePreloads(href);
      if (!imports) return;
      for (const i of imports) {
        hrefs.add(i);
        enqueue(i);
      }
    })();
    promise.finally(() => {
      queue.delete(promise);
      queue.size || resolve();
    });
    queue.add(promise);
  }

  if (queue.size) return new Promise<void>((y) => (resolve = y));
}

/**
 * Given a specifier (URL) that was previously resolved by
 * resolveModulePreloads, returns the computed subresource integrity hash.
 */
export function resolveModuleIntegrity(href: string): string | undefined {
  return integrityCache.get(href);
}

function resolveBuiltin(base: "." | "_import", path: string, specifier: string): string {
  return relativeUrl(join(base === "." ? "_import" : ".", path), join("_observablehq", specifier));
}

/**
 * Given the specified local import, applies the ?sha query string based on the
 * content hash of the imported module and its transitively imported modules.
 */
function resolveImportHash(root: string, path: string, specifier: string): string {
  return `${specifier}?sha=${getModuleHash(root, resolvePath(path, specifier))}`;
}

/**
 * Resolves the content hash for the module at the specified path within the
 * given source root. This involves parsing the specified module to process
 * transitive imports.
 */
function getModuleHash(root: string, path: string): string {
  const hash = createHash("sha256");
  try {
    hash.update(readFileSync(join(root, path), "utf-8"));
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  // TODO can’t simply concatenate here; we need a delimiter
  const {imports, features} = parseLocalImports(root, [path]);
  for (const i of [...imports, ...features]) {
    if (i.type === "local" || i.type === "FileAttachment") {
      try {
        hash.update(readFileSync(join(root, i.name), "utf-8"));
      } catch (error) {
        if (!isEnoent(error)) throw error;
        continue;
      }
    }
  }
  return hash.digest("hex");
}

function rewriteImportSpecifier(node) {
  return node.type === "ImportDefaultSpecifier"
    ? `default: ${node.local.name}`
    : node.imported.name === node.local.name
    ? node.local.name
    : `${node.imported.name}: ${node.local.name}`;
}

export function isPathImport(specifier: string): boolean {
  return ["./", "../", "/"].some((prefix) => specifier.startsWith(prefix));
}

export function isLocalImport(specifier: string, path: string): boolean {
  return isPathImport(specifier) && !resolvePath(path, specifier).startsWith("../");
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}
