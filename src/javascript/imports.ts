import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {Parser} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression, Node} from "acorn";
import {simple} from "acorn-walk";
import {isEnoent} from "../error.js";
import {type ImportReference, type JavaScriptNode, parseOptions} from "../javascript.js";
import {Sourcemap} from "../sourcemap.js";
import {relativeUrl} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

// Finds all export declarations in the specified node. (This is used to
// disallow exports within JavaScript code blocks.)
export function findExports(body: Node): (ExportAllDeclaration | ExportNamedDeclaration)[] {
  const exports: (ExportAllDeclaration | ExportNamedDeclaration)[] = [];

  simple(body, {
    ExportAllDeclaration: findExport,
    ExportNamedDeclaration: findExport
  });

  function findExport(node: ExportAllDeclaration | ExportNamedDeclaration) {
    exports.push(node);
  }

  return exports;
}

// Finds all imports (both static and dynamic) in the specified node.
// Recursively processes any imported local ES modules. The returned transitive
// import paths are relative to the given source path.
export function findImports(body: Node, root: string, path: string): ImportReference[] {
  const imports: ImportReference[] = [];
  const paths = new Set<string>();

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport
  });

  function findImport(node) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        addLocalImports(root, join(value.startsWith("/") ? "." : dirname(path), value), paths, imports);
      } else {
        imports.push({name: value, type: "global"});
      }
    }
  }

  // Make all local paths relative to the source path.
  for (const i of imports) {
    if (i.type === "local") {
      i.name = relativeUrl(path, i.name);
    }
  }

  return imports;
}

// Parses the module at the specified path to find transitive imports,
// processing imported modules recursively. Accumulates visited paths, and
// appends to imports. The paths here are always relative to the root (unlike
// findImports above!).
function addLocalImports(
  root: string,
  path: string,
  paths: Set<string> = new Set(),
  imports: ImportReference[] = []
): ImportReference[] {
  if (paths.has(path)) return imports;
  paths.add(path);
  imports.push({type: "local", name: path});
  try {
    const input = readFileSync(join(root, path), "utf-8");
    const program = Parser.parse(input, parseOptions);
    simple(program, {
      ImportDeclaration: findImport,
      ImportExpression: findImport,
      ExportAllDeclaration: findImport,
      ExportNamedDeclaration: findImport
    });
  } catch {
    // ignore missing files and syntax errors
  }
  function findImport(node) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, path)) {
        addLocalImports(root, join(value.startsWith("/") ? "." : dirname(path), value), paths, imports);
      } else {
        imports.push({name: value, type: "global"});
        // non-local imports don't need to be traversed
      }
    }
  }
  return imports;
}

// Resolves the content hash for the module at the specified path within the
// given source root. This involves parsing the specified module to process
// transitive imports.
function getModuleHash(root: string, path: string): string {
  const hash = createHash("sha256");
  try {
    hash.update(readFileSync(join(root, path), "utf-8"));
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  // TODO can’t simply concatenate here; we need a delimiter
  for (const i of addLocalImports(root, path)) {
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

// Given the specified local import, applies the ?sha query string based on the
// content hash of the imported module and its transitively imported modules.
function resolveImportHash(root: string, path: string, specifier: string): string {
  return `${specifier}?sha=${getModuleHash(root, join(specifier.startsWith("/") ? "." : dirname(path), specifier))}`;
}

// Rewrites import specifiers in the specified ES module source.
export function rewriteModule(input: string, sourcePath: string, resolver: ImportResolver): string {
  const body = Parser.parse(input, parseOptions) as any;
  const output = new Sourcemap(input);

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport
  });

  function rewriteImport(node: ImportDeclaration | ImportExpression | ExportAllDeclaration | ExportNamedDeclaration) {
    if (isStringLiteral(node.source)) {
      output.replaceLeft(
        node.source.start,
        node.source.end,
        JSON.stringify(resolver(sourcePath, getStringLiteralValue(node.source)))
      );
    }
  }

  return String(output);
}

// Rewrites import specifiers in the specified JavaScript fenced code block or
// inline expression. TODO parallelize multiple static imports
export function rewriteImports(
  output: Sourcemap,
  cell: JavaScriptNode,
  sourcePath: string,
  resolver: ImportResolver
): void {
  simple(cell.body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        output.replaceLeft(
          node.source.start,
          node.source.end,
          JSON.stringify(resolver(sourcePath, getStringLiteralValue(node.source)))
        );
      }
    },
    ImportDeclaration(node) {
      if (isStringLiteral(node.source)) {
        cell.async = true;
        output.replaceLeft(
          node.start,
          node.end,
          `const ${
            node.specifiers.some(isNotNamespaceSpecifier)
              ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
              : node.specifiers.find(isNamespaceSpecifier)?.local.name ?? "{}"
          } = await import(${JSON.stringify(resolver(sourcePath, getStringLiteralValue(node.source)))});`
        );
      }
    }
  });
}

export function createModulePreviewResolver(root: string): ImportResolver {
  return (sourcePath, value) => {
    return relativeUrl(
      sourcePath,
      isLocalImport(value, sourcePath)
        ? join(value.startsWith("/") ? "." : dirname(sourcePath), resolveImportHash(root, sourcePath, value))
        : resolveImport(value)
    );
  };
}

export function createMarkdownPreviewResolver(root: string): ImportResolver {
  return (sourcePath, value) => {
    return relativeUrl(
      sourcePath,
      isLocalImport(value, sourcePath)
        ? join("_import", value.startsWith("/") ? "." : dirname(sourcePath), resolveImportHash(root, sourcePath, value))
        : resolveImport(value)
    );
  };
}

export type ImportResolver = (path: string, specifier: string) => string;

function rewriteImportSpecifier(node) {
  return node.type === "ImportDefaultSpecifier"
    ? `default: ${node.local.name}`
    : node.imported.name === node.local.name
    ? node.local.name
    : `${node.imported.name}: ${node.local.name}`;
}

export function isLocalImport(value: string, sourcePath: string): boolean {
  return (
    ["./", "../", "/"].some((prefix) => value.startsWith(prefix)) &&
    !join(".", dirname(sourcePath), value).startsWith("../")
  );
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}

export function resolveImport(specifier: string): string {
  return !specifier.startsWith("npm:")
    ? specifier
    : specifier === "npm:@observablehq/runtime"
    ? "/_observablehq/runtime.js"
    : `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}/+esm`;
}
