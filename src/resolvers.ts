import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {Parser} from "acorn";
import {simple} from "acorn-walk";
import {findFiles} from "./javascript/files.js";
import {defaultGlobals} from "./javascript/globals.js";
import type {ExportNode, ImportNode} from "./javascript/imports.js";
import {isPathImport} from "./javascript/imports.js";
import {getFileHash, getModuleHash, getModuleInfo} from "./javascript/module.js";
import {getStringLiteralValue, isStringLiteral} from "./javascript/node.js";
import {parseOptions} from "./javascript/parse.js";
import {getImplicitFileImports, getImplicitInputImports} from "./libraries.js";
import type {MarkdownPage} from "./markdown.js";
import {populateNpmCache, resolveNpmImport} from "./npm.js";
import {relativePath, resolvePath} from "./path.js";
import {Sourcemap} from "./sourcemap.js";

export interface Resolvers {
  files: Set<string>;
  localImports: Set<string>;
  staticImports: Set<string>;
  resolveFile(specifier: string): string;
  resolveImport(specifier: string): string;
  resolveDynamicImport(specifier: string): string;
}

const builtins = new Map<string, string>([
  ["npm:@observablehq/runtime", "/_observablehq/runtime.js"],
  ["npm:@observablehq/stdlib", "/_observablehq/stdlib.js"],
  ["npm:@observablehq/dot", "/_observablehq/stdlib/dot.js"], // TODO publish to npm
  ["npm:@observablehq/duckdb", "/_observablehq/stdlib/duckdb.js"], // TODO publish to npm
  ["npm:@observablehq/inputs", "/_observablehq/stdlib/inputs.js"], // TODO publish to npm
  ["npm:@observablehq/mermaid", "/_observablehq/stdlib/mermaid.js"], // TODO publish to npm
  ["npm:@observablehq/tex", "/_observablehq/stdlib/tex.js"], // TODO publish to npm
  ["npm:@observablehq/sqlite", "/_observablehq/stdlib/sqlite.js"], // TODO publish to npm
  ["npm:@observablehq/xlsx", "/_observablehq/stdlib/xlsx.js"], // TODO publish to npm
  ["npm:@observablehq/zip", "/_observablehq/stdlib/zip.js"] // TODO publish to npm
]);

export async function getResolvers(page: MarkdownPage, {root, path}: {root: string; path: string}): Promise<Resolvers> {
  const files = new Set<string>();
  const fileMethods = new Set<string>();
  const localImports = new Set<string>();
  const staticImports = new Set<string>();
  const resolutions = new Map<string, string>();

  // Add built-in modules.
  staticImports.add("observablehq:client");
  staticImports.add("npm:@observablehq/runtime");
  staticImports.add("npm:@observablehq/stdlib");

  // Collect directly attached files, local imports, and static imports.
  for (const piece of page.pieces) {
    for (const {node} of piece.code) {
      for (const f of node.files) {
        files.add(f.name);
        if (f.method) fileMethods.add(f.method);
      }
      for (const i of node.imports) {
        if (i.type === "local") {
          localImports.add(i.name);
        }
        if (i.method === "static") {
          staticImports.add(i.name);
        }
      }
    }
  }

  for (const i of localImports) {
    const p = resolvePath(path, i);
    const info = getModuleInfo(root, p);
    if (!info) continue;
    for (const f of info.files) {
      files.add(relativePath(path, resolvePath(p, f)));
    }
    for (const m of info.fileMethods) {
      fileMethods.add(m);
    }
    for (const o of info.localStaticImports) {
      const r = relativePath(path, resolvePath(p, o));
      localImports.add(r);
      staticImports.add(r);
    }
    for (const o of info.localDynamicImports) {
      localImports.add(relativePath(path, resolvePath(p, o)));
    }
    for (const o of info.globalStaticImports) {
      staticImports.add(o);
    }
  }

  // Add implicit imports for files. These are technically dynamic imports, but
  // we assume that referenced files will be loaded immediately and so treat
  // them as static for preloads.
  for (const i of getImplicitFileImports(fileMethods)) {
    staticImports.add(i);
  }

  // Add implicit imports for standard library built-ins, such as d3 and Plot.
  for (const i of getImplicitInputImports(findFreeInputs(page))) {
    staticImports.add(i);
  }

  // Resolve npm: imports.
  for (const specifier of staticImports) {
    if (specifier.startsWith("npm:") && !builtins.has(specifier)) {
      const resolution = await resolveNpmImport(root, specifier.slice("npm:".length));
      resolutions.set(specifier, resolution);
      await populateNpmCache(root, resolution);
    }
  }

  // TODO Resolve any npm: protocol imports that were not statically declared to jsDelivr.
  // TODO Is stylesheet resolution going to live here, too?
  function resolveImport(specifier: string): string {
    return isLocalImport(specifier, path)
      ? relativePath(path, resolveImportPath(root, resolvePath(path, specifier)))
      : builtins.has(specifier)
      ? relativePath(path, builtins.get(specifier)!)
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}.js`)
      : resolutions.has(specifier)
      ? relativePath(path, resolutions.get(specifier)!)
      : specifier;
  }

  function resolveFile(specifier: string): string {
    return relativePath(path, resolveFilePath(root, resolvePath(path, specifier)));
  }

  return {
    files,
    localImports,
    staticImports,
    resolveFile,
    resolveImport,
    resolveDynamicImport: resolveImport
  };
}

/** Rewrites import specifiers and FileAttachment calls in the specified ES module. */
export async function rewriteModule(root: string, path: string, sourcePath = path): Promise<string> {
  const input = await readFile(join(root, sourcePath), "utf-8");
  const body = Parser.parse(input, parseOptions); // TODO ignore syntax error?
  const output = new Sourcemap(input);
  const imports: (ImportNode | ExportNode)[] = [];

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    imports.push(node);
  }

  for (const {name, node} of findFiles(body, sourcePath, input)) {
    const p = relativePath(path, resolvePath(sourcePath, name));
    output.replaceLeft(node.arguments[0].start, node.arguments[0].end, `${JSON.stringify(p)}, import.meta.url`);
  }

  // TODO Dynamic imports are resolved differently (to jsDelivr)
  // TODO Consolidate duplicate code with getResolvers?
  for (const node of imports) {
    if (node.source && isStringLiteral(node.source)) {
      const specifier = getStringLiteralValue(node.source);
      const p = isLocalImport(specifier, path)
        ? relativePath(path, resolveImportPath(root, resolvePath(sourcePath, specifier)))
        : builtins.has(specifier)
        ? relativePath(path, builtins.get(specifier)!)
        : specifier.startsWith("observablehq:")
        ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}.js`)
        : specifier.startsWith("npm:")
        ? relativePath(path, await resolveNpmImport(root, specifier.slice("npm:".length)))
        : specifier;
      output.replaceLeft(node.source.start, node.source.end, JSON.stringify(p));
    }
  }

  return String(output);
}

export function resolveImportPath(root: string, path: string): string {
  return `/_import/${path}?sha=${getModuleHash(root, path)}`;
}

export function resolveFilePath(root: string, path: string): string {
  return `/_file/${path}?sha=${getFileHash(root, path)}`;
}

export function isLocalImport(specifier: string, path: string): boolean {
  return isPathImport(specifier) && !resolvePath(path, specifier).startsWith("../");
}

// Returns any inputs that are not declared in outputs. These typically refer to
// symbols provided by the standard library, such as d3 and Inputs.
function findFreeInputs(page: MarkdownPage): Set<string> {
  const outputs = new Set<string>(defaultGlobals).add("display").add("view").add("visibility").add("invalidation");
  const inputs = new Set<string>();

  // Compute all declared variables.
  for (const piece of page.pieces) {
    for (const {node} of piece.code) {
      if (node.declarations) {
        for (const {name} of node.declarations) {
          outputs.add(name);
        }
      }
    }
  }

  // Compute all unbound references.
  for (const piece of page.pieces) {
    for (const {node} of piece.code) {
      for (const {name} of node.references) {
        if (!outputs.has(name)) {
          inputs.add(name);
        }
      }
    }
  }

  return inputs;
}
