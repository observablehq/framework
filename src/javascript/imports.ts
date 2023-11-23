import {readFileSync} from "node:fs";
import {dirname, join, normalize, relative} from "node:path";
import {Parser} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression, Node} from "acorn";
import {simple} from "acorn-walk";
import {isEnoent} from "../error.js";
import {computeHash} from "../hash.js";
import {type ImportReference, type JavaScriptNode, parseOptions} from "../javascript.js";
import {Sourcemap} from "../sourcemap.js";
import {relativeUrl} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

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

export function findImports(body: Node, root: string, sourcePath: string): ImportReference[] {
  const imports: ImportReference[] = [];
  const paths = new Set<string>();

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport
  });

  function findImport(node) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value, sourcePath)) {
        findLocalImports(normalize(value));
      } else {
        imports.push({name: value, type: "global"});
      }
    }
  }

  // If this is an import of a local ES module, recursively parse the module to
  // find transitive imports. The path is always relative to the source path of
  // the Markdown file, even across transitive imports.
  function findLocalImports(path) {
    if (path.startsWith("/")) path = relative(dirname(sourcePath), path);
    if (paths.has(path)) return;
    paths.add(path);
    imports.push({type: "local", name: path});
    try {
      const input = readFileSync(join(root, dirname(sourcePath), path), "utf-8");
      const program = Parser.parse(input, parseOptions);
      simple(program, {
        ImportDeclaration: findLocalImport,
        ImportExpression: findLocalImport,
        ExportAllDeclaration: findLocalImport,
        ExportNamedDeclaration: findLocalImport
      });
    } catch {
      // ignore missing files and syntax errors
    }
    function findLocalImport(node) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        if (isLocalImport(value, sourcePath)) {
          findLocalImports(value.startsWith("/") ? normalize(value) : join(dirname(path), value));
        } else {
          imports.push({name: value, type: "global"});
          // non-local imports don't need to be traversed
        }
      }
    }
  }

  return imports;
}

function getHash(path: string): string {
  let source = "";
  try {
    source = readFileSync(path, "utf-8");
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  return computeHash(source).slice(0, 16);
}

function maybeHash(root: string, sourcePath: string, value: string): string {
  return isLocalImport(value, sourcePath) ? `${value}?sha=${getHash(join(root, dirname(sourcePath), value))}` : value;
}

export function resolveSources(input: string, root: string, sourcePath: string): string {
  const body = Parser.parse(input, parseOptions) as any;
  const output = new Sourcemap(input);

  simple(body, {
    ImportDeclaration: resolveSource,
    ImportExpression: resolveSource,
    ExportAllDeclaration: resolveSource,
    ExportNamedDeclaration: resolveSource
  });

  function resolveSource(node: ImportDeclaration | ImportExpression | ExportAllDeclaration | ExportNamedDeclaration) {
    if (isStringLiteral(node.source)) {
      const value = maybeHash(root, sourcePath, getStringLiteralValue(node.source));
      output.replaceLeft(
        node.source.start,
        node.source.end,
        JSON.stringify(value.startsWith("/") ? relativeImport(sourcePath, value) : resolveImport(value))
      );
    }
  }

  return String(output);
}

// TODO parallelize multiple static imports
export function rewriteImports(output: any, rootNode: JavaScriptNode, root: string, sourcePath: string): void {
  simple(rootNode.body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        const value = maybeHash(root, sourcePath, getStringLiteralValue(node.source));
        output.replaceLeft(
          node.source.start,
          node.source.end,
          JSON.stringify(isLocalImport(value, sourcePath) ? relativeImport(sourcePath, value) : resolveImport(value))
        );
      }
    },
    ImportDeclaration(node) {
      if (isStringLiteral(node.source)) {
        const value = maybeHash(root, sourcePath, getStringLiteralValue(node.source));
        rootNode.async = true;
        output.replaceLeft(
          node.start,
          node.end,
          `const ${
            node.specifiers.some(isNotNamespaceSpecifier)
              ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
              : node.specifiers.find(isNamespaceSpecifier)?.local.name ?? "{}"
          } = await import(${JSON.stringify(
            isLocalImport(value, sourcePath) ? relativeImport(sourcePath, value) : resolveImport(value)
          )});`
        );
      }
    }
  });
}

function relativeImport(sourcePath, value) {
  return relativeUrl(sourcePath, join("/_import/", value.startsWith("/") ? "." : dirname(sourcePath), value));
}

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
