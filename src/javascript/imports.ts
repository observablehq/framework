import {readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import type {Node} from "acorn";
import type {CallExpression} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {isPathImport, relativePath, resolveLocalPath} from "../path.js";
import {parseProgram} from "./parse.js";
import {getStringLiteralValue, isStringLiteral} from "./source.js";
import {syntaxError} from "./syntaxError.js";

export interface ImportReference {
  /** The relative path to the import from the referencing source. */
  name: string;
  /** Is this a reference to a local module, or a non-local (e.g., npm) one? */
  type: "local" | "global";
  /** Is this a static import, a dynamic import, or import.meta.resolve? */
  method: "static" | "dynamic" | "resolve";
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
  const keys = new Set<string>();

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    ExportAllDeclaration: findImport,
    ExportNamedDeclaration: findImport,
    CallExpression: findImportMetaResolve
  });

  function addImport(ref: ImportReference) {
    const key = `${ref.type}:${ref.method}:${ref.name}`;
    if (!keys.has(key)) keys.add(key), imports.push(ref);
  }

  function findImport(node: ImportNode | ExportNode) {
    const source = node.source;
    if (!source || !isStringLiteral(source)) return;
    const name = decodeURI(getStringLiteralValue(source));
    const method = node.type === "ImportExpression" ? "dynamic" : "static";
    if (isPathImport(name)) {
      const localPath = resolveLocalPath(path, name);
      if (!localPath) throw syntaxError(`non-local import: ${name}`, node, input); // prettier-ignore
      addImport({name: relativePath(path, localPath), type: "local", method});
    } else {
      addImport({name, type: "global", method});
    }
  }

  function findImportMetaResolve(node: CallExpression) {
    const source = node.arguments[0];
    if (!isImportMetaResolve(node) || !isStringLiteral(source)) return;
    const name = decodeURI(getStringLiteralValue(source));
    if (isPathImport(name)) {
      const localPath = resolveLocalPath(path, name);
      if (!localPath) throw syntaxError(`non-local import: ${name}`, node, input); // prettier-ignore
      addImport({name: relativePath(path, localPath), type: "local", method: "resolve"});
    } else {
      addImport({name, type: "global", method: "resolve"});
    }
  }

  return imports;
}

export function isImportMetaResolve(node: CallExpression): boolean {
  return (
    node.callee.type === "MemberExpression" &&
    node.callee.object.type === "MetaProperty" &&
    node.callee.object.meta.name === "import" &&
    node.callee.object.property.name === "meta" &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "resolve" &&
    node.arguments.length > 0
  );
}

export function isJavaScript(path: string): boolean {
  return /\.(m|c)?js(\?|$)/i.test(path);
}

const parseImportsCache = new Map<string, Promise<ImportReference[]>>();

export async function parseImports(root: string, path: string): Promise<ImportReference[]> {
  if (!isJavaScript(path)) return []; // TODO traverse CSS, too
  const filePath = join(root, path);
  let promise = parseImportsCache.get(filePath);
  if (promise) return promise;
  promise = (async function () {
    try {
      const source = await readFile(filePath, "utf-8");
      const body = parseProgram(source);
      return findImports(body, path, source);
    } catch (error: any) {
      console.warn(`unable to fetch or parse ${path}: ${error.message}`);
      return [];
    }
  })();
  parseImportsCache.set(filePath, promise);
  return promise;
}
