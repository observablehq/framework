import {createHash} from "node:crypto";
import {readFileSync, statSync} from "node:fs";
import {extname, join} from "node:path";
import {Parser} from "acorn";
import type {Node} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {parseOptions} from "../javascript.js";
import {relativePath, resolvePath} from "../path.js";
import {Sourcemap} from "../sourcemap.js";
import {findFiles} from "./files.js";
import {type StringLiteral, getStringLiteralValue, isStringLiteral} from "./node.js";
import {resolveNpmImport} from "./npm.js";
import {syntaxError} from "./syntaxError.js";

export interface ImportReference {
  /** The relative path to the import from the referencing source. */
  name: string;
  /** Is this a reference to a local module, or a non-local (e.g., npm) one? */
  type: "local" | "global";
  /** Is this a static import declaration, or a dynamic import expression? */
  method: "static" | "dynamic";
}

export type ImportNode = ImportDeclaration | ImportExpression;
export type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

/**
 * Finds all export declarations in the specified node. (This is used to
 * disallow exports within JavaScript code blocks.) Note that this includes both
 * "export const foo" declarations and "export {foo} from bar" declarations.
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

/** Returns true if the body includes an import declaration. */
export function hasImportDeclaration(body: Node): boolean {
  let has = false;

  simple(body, {
    ImportDeclaration() {
      has = true;
    }
  });

  return has;
}
/**
 * Finds all imports (both static and dynamic, local and global) with
 * statically-analyzable sources in the specified node. Note: this includes only
 * direct imports, not transitive imports. Note: this also includes exports, but
 * exports are only allowed in JavaScript modules (not in Markdown).
 */
export function findImports(body: Node, path: string, input: string): ImportReference[] {
  const imports: ImportReference[] = [];

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    ExportAllDeclaration: findImport,
    ExportNamedDeclaration: findImport
  });

  function findImport(node: ImportNode | ExportNode) {
    if (!node.source || !isStringLiteral(node.source)) return;
    const name = decodeURIComponent(getStringLiteralValue(node.source));
    const type = isPathImport(name) ? "local" : "global";
    const method = node.type === "ImportExpression" ? "dynamic" : "static";
    if (type === "local" && !resolvePath(path, name).startsWith("/")) throw syntaxError(`non-local import: ${name}`, node, input); // prettier-ignore
    imports.push({name, type, method});
  }

  return imports;
}

/** Rewrites import specifiers and FileAttachment calls in the specified ES module source. */
export async function rewriteModule(input: string, path: string, resolver: ImportResolver): Promise<string> {
  const body = Parser.parse(input, parseOptions);
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

  for (const file of findFiles(body, path, input)) {
    const result = JSON.stringify(relativePath(join("_import", path), resolvePath("_file", path, file.name)));
    output.replaceLeft(file.node.arguments[0].start, file.node.arguments[0].end, `${result}, import.meta.url`);
  }

  for (const node of imports) {
    if (node.source && isStringLiteral(node.source)) {
      output.replaceLeft(
        node.source.start,
        node.source.end,
        JSON.stringify(await resolver(getStringLiteralValue(node.source)))
      );
    }
  }

  return String(output);
}

/**
 * Rewrites import specifiers in the specified JavaScript fenced code block or
 * inline expression.
 */
export async function rewriteImports(output: Sourcemap, body: Node, resolver: ImportResolver): Promise<void> {
  const expressions: ImportExpression[] = [];
  const declarations: ImportDeclaration[] = [];

  simple(body, {
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
      JSON.stringify(await resolver(getStringLiteralValue(node.source as StringLiteral)))
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
    imports.push(`import(${JSON.stringify(await resolver(getStringLiteralValue(node.source as StringLiteral)))})`);
  }

  if (declarations.length > 1) {
    output.insertLeft(0, `const [${specifiers.join(", ")}] = await Promise.all([${imports.join(", ")}]);\n`);
  } else if (declarations.length === 1) {
    output.insertLeft(0, `const ${specifiers[0]} = await ${imports[0]};\n`);
  }
}

/**
 * Resolves the given import specifier, typically as a relative path starting
 * with "./" or "../".
 */
export type ImportResolver = (specifier: string) => Promise<string>;

/**
 * Returns an import resolver for the given source root and (serving) path. In
 * Markdown, the serving path and the source path are the same; but within local
 * JavaScript modules, the serving path is under _import.
 */
export function createImportResolver(root: string, path: string, sourcePath = path): ImportResolver {
  return async (specifier) => {
    return isLocalImport(specifier, path)
      ? relativePath(path, resolvePath("_import", sourcePath, resolveImportHash(root, sourcePath, specifier))) // prettier-ignore
      : specifier === "npm:@observablehq/runtime"
      ? relativePath(path, "_observablehq/runtime.js")
      : specifier === "npm:@observablehq/stdlib"
      ? relativePath(path, "_observablehq/stdlib.js")
      : specifier === "npm:@observablehq/dot"
      ? relativePath(path, "_observablehq/stdlib/dot.js") // TODO publish to npm
      : specifier === "npm:@observablehq/duckdb"
      ? relativePath(path, "_observablehq/stdlib/duckdb.js") // TODO publish to npm
      : specifier === "npm:@observablehq/inputs"
      ? relativePath(path, "_observablehq/stdlib/inputs.js") // TODO publish to npm
      : specifier === "npm:@observablehq/mermaid"
      ? relativePath(path, "_observablehq/stdlib/mermaid.js") // TODO publish to npm
      : specifier === "npm:@observablehq/tex"
      ? relativePath(path, "_observablehq/stdlib/tex.js") // TODO publish to npm
      : specifier === "npm:@observablehq/sqlite"
      ? relativePath(path, "_observablehq/stdlib/sqlite.js") // TODO publish to npm
      : specifier === "npm:@observablehq/xlsx"
      ? relativePath(path, "_observablehq/stdlib/xlsx.js") // TODO publish to npm
      : specifier === "npm:@observablehq/zip"
      ? relativePath(path, "_observablehq/stdlib/zip.js") // TODO publish to npm
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`)
      : specifier.startsWith("npm:")
      ? relativePath(path, await resolveNpmImport(root, specifier.slice("npm:".length)))
      : specifier;
  };
}

/**
 * Given the specified local import, applies the ?sha query string based on the
 * content hash of the imported module and its transitively imported modules.
 */
function resolveImportHash(root: string, path: string, specifier: string): string {
  return `${specifier}?sha=${getModuleHash(root, resolvePath(path, specifier))}`;
}

type FileHashInfo = {mtimeMs: number; hash: string};
type ModuleHashInfo = {mtimeMs: number; hash: string; imports: string[]; files: string[]};

const fileHashCache = new Map<string, FileHashInfo>();
const moduleHashCache = new Map<string, ModuleHashInfo>();

/**
 * Resolves the content hash for the module at the specified path within the
 * given source root. This involves parsing the specified file to process
 * transitive imports.
 */
function getModuleHash(root: string, path: string): string {
  const hash = createHash("sha256");
  const paths = new Set([path]);
  for (const path of paths) {
    const key = join(root, path);
    let mtimeMs: number;
    try {
      ({mtimeMs} = statSync(key));
    } catch {
      return ""; // ignore missing file
    }
    let info = moduleHashCache.get(key);
    if (!info || info.mtimeMs < mtimeMs) {
      const source = readFileSync(key, "utf-8");
      const body = Parser.parse(source, parseOptions); // TODO ignore parse error
      const hash = createHash("sha256").update(source).digest("hex");
      const imports: string[] = findImports(body, path, source).filter((i) => i.type === "local").map((i) => i.name); // prettier-ignore
      const files: string[] = findFiles(body, path, source).map((i) => i.name);
      moduleHashCache.set(key, (info = {mtimeMs, hash, imports, files}));
    }
    hash.update(info.hash);
    for (const i of info.imports) paths.add(resolvePath(path, i));
    for (const i of info.files) hash.update(getFileHash(root, resolvePath(path, i)));
  }
  return hash.digest("hex");
}

function getFileHash(root: string, path: string): string {
  const key = join(root, path);
  let mtimeMs: number;
  try {
    ({mtimeMs} = statSync(key));
  } catch {
    return ""; // ignore missing file
  }
  let entry = fileHashCache.get(key);
  if (!entry || entry.mtimeMs < mtimeMs) {
    const contents = readFileSync(key);
    const hash = createHash("sha256").update(contents).digest("hex");
    fileHashCache.set(key, (entry = {mtimeMs, hash}));
  }
  return entry.hash;
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
