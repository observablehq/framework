import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Parser} from "acorn";
import type {CallExpression, Identifier, Node, Program} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {isEnoent} from "../error.js";
import {type Feature, type ImportReference, type JavaScriptNode} from "../javascript.js";
import {parseOptions} from "../javascript.js";
import {Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";
import {findFetches, maybeAddFetch, rewriteIfLocalFetch} from "./fetches.js";
import {defaultGlobals} from "./globals.js";
import {findReferences} from "./references.js";

type ImportNode = ImportDeclaration | ImportExpression;
type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

export interface ImportsAndFetches {
  imports: ImportReference[];
  fetches: Feature[];
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

export function findImports(body: Node, root: string, path: string): ImportsAndFetches {
  const references: Identifier[] = findReferences(body, defaultGlobals);
  const imports: ImportReference[] = [];
  const fetches: Feature[] = [];
  const paths: string[] = [];

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    CallExpression: findFetch
  });

  function findImport(node: ImportNode) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        paths.push(resolvePath(path, value));
      } else {
        imports.push({name: value, type: "global"});
      }
    }
  }

  function findFetch(node) {
    maybeAddFetch(fetches, node, references, path);
  }

  // Recursively process any imported local ES modules.
  const features = parseLocalImports(root, paths);
  imports.push(...features.imports);
  fetches.push(...features.fetches);

  // Make all local paths relative to the source path.
  for (const i of imports) {
    if (i.type === "local") {
      i.name = relativeUrl(path, i.name);
    }
  }

  return {imports, fetches};
}

/**
 * Parses the module at the specified path to find transitive imports,
 * processing imported modules recursively. Accumulates visited paths, and
 * appends to imports. The paths here are always relative to the root (unlike
 * findImports above!).
 */
export function parseLocalImports(root: string, paths: string[]): ImportsAndFetches {
  const imports: ImportReference[] = [];
  const fetches: Feature[] = [];
  const set = new Set(paths);

  for (const path of set) {
    imports.push({type: "local", name: path});
    try {
      const input = readFileSync(join(root, path), "utf-8");
      const program = Parser.parse(input, parseOptions);

      simple(
        program,
        {
          ImportDeclaration: findImport,
          ImportExpression: findImport,
          ExportAllDeclaration: findImport,
          ExportNamedDeclaration: findImport
        },
        undefined,
        path
      );
      fetches.push(...findFetches(program, path));
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

  return {imports, fetches};
}

/** Rewrites import specifiers in the specified ES module source. */
export async function rewriteModule(input: string, sourcePath: string, resolver: ImportResolver): Promise<string> {
  const body = Parser.parse(input, parseOptions);
  const references: Identifier[] = findReferences(body, defaultGlobals);
  const output = new Sourcemap(input);
  const imports: (ImportNode | ExportNode)[] = [];

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport,
    CallExpression(node: CallExpression) {
      rewriteIfLocalFetch(node, output, references, sourcePath, {resolveMeta: true});
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
        JSON.stringify(await resolver(sourcePath, getStringLiteralValue(node.source)))
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

  for (const node of declarations) {
    output.replaceLeft(
      node.start,
      node.end,
      `const ${
        node.specifiers.some(isNotNamespaceSpecifier)
          ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
          : node.specifiers.find(isNamespaceSpecifier)?.local.name ?? "{}"
      } = await import(${JSON.stringify(await resolver(sourcePath, getStringLiteralValue(node.source)))});`
    );
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
      : specifier === "npm:@observablehq/mermaid"
      ? resolveBuiltin(base, path, "stdlib/mermaid.js") // TODO publish to npm
      : specifier === "npm:@observablehq/tex"
      ? resolveBuiltin(base, path, "stdlib/tex.js") // TODO publish to npm
      : specifier === "npm:@observablehq/sqlite"
      ? resolveBuiltin(base, path, "stdlib/sqlite.js") // TODO publish to npm
      : specifier === "npm:@observablehq/xslx"
      ? resolveBuiltin(base, path, "stdlib/xslx.js") // TODO publish to npm
      : specifier.startsWith("npm:")
      ? await resolveNpmImport(specifier.slice("npm:".length))
      : specifier;
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

async function resolveNpmVersion(specifier: string): Promise<string> {
  const {name, range} = parseNpmSpecifier(specifier); // ignore path
  specifier = formatNpmSpecifier({name, range});
  const search = range ? `?specifier=${range}` : "";
  return (await cachedFetch(`https://data.jsdelivr.com/v1/packages/npm/${name}/resolved${search}`)).body.version;
}

export async function resolveNpmImport(specifier: string): Promise<string> {
  const {name, path = "+esm"} = parseNpmSpecifier(specifier);
  const version = await resolveNpmVersion(specifier);
  return `https://cdn.jsdelivr.net/npm/${name}@${version}/${path}`;
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
    const {headers, body} = await cachedFetch(href);
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
        if (["./", "../", "/"].some((prefix) => value.startsWith(prefix))) {
          imports.add(String(new URL(value, href)));
        }
      }
    }
    integrityCache.set(href, `sha384-${createHash("sha384").update(body).digest("base64")}`);
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
  const {imports, fetches} = parseLocalImports(root, [path]);
  for (const i of [...imports, ...fetches]) {
    if (i.type === "local") {
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

export function isLocalImport(specifier: string, path: string): boolean {
  return (
    ["./", "../", "/"].some((prefix) => specifier.startsWith(prefix)) && !resolvePath(path, specifier).startsWith("../")
  );
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}
