import {createHash} from "node:crypto";
import {Parser} from "acorn";
import type {Identifier, Node, Program} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {readFileSync} from "../brandedFs.js";
import {
  FilePath,
  UrlPath,
  fileJoin,
  filePathToUrlPath,
  fileSep,
  unUrlPath,
  urlJoin,
  urlPathToFilePath
} from "../brandedPath.js";
import {isEnoent} from "../error.js";
import {type Feature, type ImportReference, type JavaScriptNode} from "../javascript.js";
import {parseOptions} from "../javascript.js";
import {Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getFeature, getFeatureReferenceMap, getStringLiteralValue, isStringLiteral} from "./features.js";

type ImportNode = ImportDeclaration | ImportExpression;
type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

let npmVersionResolutionEnabled = true;
let remoteModulePreloadEnabled = true;

export function enableNpmVersionResolution(enabled = true) {
  npmVersionResolutionEnabled = enabled;
}

export function enableRemoteModulePreload(enabled = true) {
  remoteModulePreloadEnabled = enabled;
}

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
export function findImports(body: Node, root: FilePath, path: FilePath): ImportsAndFeatures {
  const imports: ImportReference[] = [];
  const features: Feature[] = [];
  const paths: UrlPath[] = [];

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport
  });

  function findImport(node: ImportNode) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        paths.push(filePathToUrlPath(resolvePath(path, UrlPath(decodeURIComponent(unUrlPath(value))))));
      } else {
        imports.push({name: UrlPath(value), type: "global"});
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
      i.name = relativeUrl(filePathToUrlPath(path), UrlPath(i.name));
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
export function parseLocalImports(root: FilePath, urlPaths: UrlPath[]): ImportsAndFeatures {
  const imports: ImportReference[] = [];
  const features: Feature[] = [];
  const map = new Map<UrlPath, FilePath>(urlPaths.map((urlPath) => [urlPath, urlPathToFilePath(urlPath)]));

  for (const [urlPath, filePath] of map.entries()) {
    imports.push({type: "local", name: urlPath});
    try {
      const input = readFileSync(fileJoin(root, filePath), "utf-8");
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
        filePath
      );

      features.push(...findImportFeatures(body, urlPath, input));
    } catch (error) {
      if (!isEnoent(error) && !(error instanceof SyntaxError)) throw error;
    }
  }

  function findImport(node: ImportNode | ExportNode, path: FilePath) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        const filePath = resolvePath(path, UrlPath(value));
        map.set(filePathToUrlPath(filePath), filePath);
      } else {
        imports.push({name: UrlPath(value), type: "global"});
        // non-local imports don't need to be traversed
      }
    }
  }

  return {imports, features};
}

export function findImportFeatures(node: Node, path: UrlPath, input: string): Feature[] {
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
export async function rewriteModule(input: string, path: FilePath, resolver: ImportResolver): Promise<string> {
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
        const feature = getFeature(type, node, filePathToUrlPath(path), input); // validate syntax
        if (feature.type === "FileAttachment") {
          const arg = node.arguments[0];
          const result = JSON.stringify(
            relativeUrl(urlJoin("_import", filePathToUrlPath(path)), UrlPath(feature.name))
          );
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
 * inline expression. TODO parallelize multiple static imports.
 */
export async function rewriteImports(
  output: Sourcemap,
  cell: JavaScriptNode,
  sourcePath: FilePath,
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

export type ImportResolver = (path: FilePath, specifier: string) => Promise<UrlPath>;

export function createImportResolver(root: FilePath, base: "." | "_import" = "."): ImportResolver {
  return async (path, specifier) => {
    const urlPath = filePathToUrlPath(path);
    return isLocalImport(specifier, path)
      ? relativeUrl(
          urlPath,
          filePathToUrlPath(resolvePath(FilePath(base), path, resolveImportHash(root, urlPath, specifier)))
        )
      : specifier === "npm:@observablehq/runtime"
      ? resolveBuiltin(base, urlPath, "runtime.js")
      : specifier === "npm:@observablehq/stdlib"
      ? resolveBuiltin(base, urlPath, "stdlib.js")
      : specifier === "npm:@observablehq/dot"
      ? resolveBuiltin(base, urlPath, "stdlib/dot.js") // TODO publish to npm
      : specifier === "npm:@observablehq/duckdb"
      ? resolveBuiltin(base, urlPath, "stdlib/duckdb.js") // TODO publish to npm
      : specifier === "npm:@observablehq/inputs"
      ? resolveBuiltin(base, urlPath, "stdlib/inputs.js") // TODO publish to npm
      : specifier === "npm:@observablehq/mermaid"
      ? resolveBuiltin(base, urlPath, "stdlib/mermaid.js") // TODO publish to npm
      : specifier === "npm:@observablehq/tex"
      ? resolveBuiltin(base, urlPath, "stdlib/tex.js") // TODO publish to npm
      : specifier === "npm:@observablehq/sqlite"
      ? resolveBuiltin(base, urlPath, "stdlib/sqlite.js") // TODO publish to npm
      : specifier === "npm:@observablehq/xlsx"
      ? resolveBuiltin(base, urlPath, "stdlib/xlsx.js") // TODO publish to npm
      : specifier === "npm:@observablehq/zip"
      ? resolveBuiltin(base, urlPath, "stdlib/zip.js") // TODO publish to npm
      : specifier.startsWith("npm:")
      ? await resolveNpmImport(specifier.slice("npm:".length))
      : UrlPath(specifier);
  };
}

function parseNpmSpecifier(specifier: string): {name: string; range?: string; path?: string} {
  const parts = specifier.split("/");
  const namerange = specifier.startsWith("@") ? [parts.shift()!, parts.shift()!].join("/") : parts.shift()!;
  const ranged = namerange.indexOf("@", 1);
  return {
    name: ranged > 0 ? namerange.slice(0, ranged) : namerange,
    range: ranged > 0 ? namerange.slice(ranged + 1) : undefined,
    path: parts.length > 0 ? parts.join("/") : undefined
  };
}

function formatNpmSpecifier({name, range, path}: {name: string; range?: string; path?: string}): string {
  return `${name}${range ? `@${range}` : ""}${path ? `/${path}` : ""}`;
}

// Like import, don’t fetch the same package more than once to ensure
// consistency; restart the server if you want to clear the cache.
const fetchCache = new Map<UrlPath, Promise<{headers: Headers; body: any}>>();

async function cachedFetch(href: UrlPath): Promise<{headers: Headers; body: any}> {
  if (!remoteModulePreloadEnabled) throw new Error("remote module preload is not enabled");
  let promise = fetchCache.get(href);
  if (promise) return promise;
  promise = (async () => {
    const response = await fetch(unUrlPath(href));
    if (!response.ok) throw new Error(`unable to fetch: ${href}`);
    const json = /^application\/json(;|$)/.test(response.headers.get("content-type")!);
    const body = await (json ? response.json() : response.text());
    return {headers: response.headers, body};
  })();
  promise.catch(() => fetchCache.delete(href)); // try again on error
  fetchCache.set(href, promise);
  return promise;
}

async function resolveNpmVersion({name, range}: {name: string; range?: string}): Promise<string> {
  if (!npmVersionResolutionEnabled) throw new Error("npm version resolution is not enabled");
  if (range && /^\d+\.\d+\.\d+([-+].*)?$/.test(range)) return range; // exact version specified
  const specifier = formatNpmSpecifier({name, range});
  const search = range ? `?specifier=${range}` : "";
  const {version} = (await cachedFetch(UrlPath(`https://data.jsdelivr.com/v1/packages/npm/${name}/resolved${search}`)))
    .body;
  if (!version) throw new Error(`unable to resolve version: ${specifier}`);
  return version;
}

export async function resolveNpmImport(specifier: string): Promise<UrlPath> {
  let {name, range, path = "+esm"} = parseNpmSpecifier(specifier); // eslint-disable-line prefer-const
  if (name === "@duckdb/duckdb-wasm" && !range) range = "1.28.0"; // https://github.com/duckdb/duckdb-wasm/issues/1561
  if (name === "apache-arrow" && !range) range = "13.0.0"; // https://github.com/observablehq/framework/issues/750
  if (name === "parquet-wasm" && !range) range = "0.5.0"; // https://github.com/observablehq/framework/issues/733
  if (name === "echarts" && !range) range = "5.4.3"; // https://github.com/observablehq/framework/pull/811
  try {
    return UrlPath(`https://cdn.jsdelivr.net/npm/${name}@${await resolveNpmVersion({name, range})}/${path}`);
  } catch {
    return UrlPath(`https://cdn.jsdelivr.net/npm/${name}${range ? `@${range}` : ""}/${path}`);
  }
}

const preloadCache = new Map<UrlPath, Promise<Set<UrlPath> | undefined>>();

/**
 * Fetches the module at the specified URL and returns a promise to any
 * transitive modules it imports (on the same host; only path-based imports are
 * considered), as well as its subresource integrity hash. Only static imports
 * are considered, and the fetched module must be have immutable public caching;
 * dynamic imports may not be used and hence are not preloaded.
 */
async function fetchModulePreloads(href: UrlPath): Promise<Set<UrlPath> | undefined> {
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
    const imports = new Set<UrlPath>();
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
        if (isPathImport(value)) imports.add(UrlPath(String(new URL(value, unUrlPath(href)))));
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
export async function resolveModulePreloads(hrefs: Set<UrlPath>): Promise<void> {
  if (!remoteModulePreloadEnabled) return;
  let resolve: () => void;
  const visited = new Set<UrlPath>();
  const queue = new Set<Promise<void>>();

  for (const href of hrefs) {
    if (href.startsWith("https:")) {
      enqueue(href);
    }
  }

  function enqueue(href: UrlPath) {
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

function resolveBuiltin(base: "." | "_import", path: UrlPath, specifier: string): UrlPath {
  return relativeUrl(urlJoin(base === "." ? "_import" : ".", path), urlJoin("_observablehq", specifier));
}

/**
 * Given the specified local import, applies the ?sha query string based on the
 * content hash of the imported module and its transitively imported modules.
 */
function resolveImportHash(root: FilePath, path: UrlPath, specifier: string): UrlPath {
  return UrlPath(
    `${specifier}?sha=${getModuleHash(
      root,
      filePathToUrlPath(resolvePath(urlPathToFilePath(path), UrlPath(specifier)))
    )}`
  );
}

/**
 * Resolves the content hash for the module at the specified path within the
 * given source root. This involves parsing the specified module to process
 * transitive imports.
 */
function getModuleHash(root: FilePath, path: UrlPath): string {
  const hash = createHash("sha256");
  const filePath = urlPathToFilePath(path);
  try {
    hash.update(readFileSync(fileJoin(root, filePath), "utf-8"));
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  // TODO can’t simply concatenate here; we need a delimiter
  const {imports, features} = parseLocalImports(root, [path]);
  for (const i of [...imports, ...features]) {
    if (i.type === "local" || i.type === "FileAttachment") {
      try {
        hash.update(readFileSync(fileJoin(root, urlPathToFilePath(UrlPath(i.name))), "utf-8"));
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

export function isLocalImport(specifier: string, path: FilePath): boolean {
  return isPathImport(specifier) && !resolvePath(path, UrlPath(specifier)).startsWith(`..${fileSep}`);
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}
