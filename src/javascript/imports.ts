import {Parser} from "acorn";
import type {Node} from "acorn";
import {simple} from "acorn-walk";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import type {ParsedJavaScriptNode} from "../javascript.js";
import {parseOptions} from "../javascript.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";
import {isLocalImport, getPathFromRoot} from "./helpers.js";

export function findImports(body: Node, root: string, sourcePath?: string) {
  const imports: {name: string}[] = [];
  const paths = new Set<string>();

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    ExportAllDeclaration: findImport,
    ExportNamedDeclaration: findImport
  });

  function findImport(node) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (isLocalImport(value)) {
        const path = getPathFromRoot(root, sourcePath, value);
        findLocalImports(path);
      } else {
        imports.push({name: value});
      }
    }
  }

  // If this is an import of a local ES module, recursively parse the module to
  // find transitive imports.
  function findLocalImports(path) {
    if (paths.has(path)) return;
    paths.add(path);
    try {
      const input = readFileSync(path, "utf-8");
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
        if (isLocalImport(value)) {
          const subpath = join(dirname(path), value);
          findLocalImports(subpath);
          imports.push({name: path});
        } else {
          imports.push({name: value});
        }
      }
    }
  }
  return imports;
}

// TODO parallelize multiple static imports
export function rewriteImports(output: any, rootNode: ParsedJavaScriptNode, root: string, sourcePath?: string) {
  simple(rootNode.body, {
    ImportExpression(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        // TODO(cmo) - FIX - this isn't right
        if (isLocalImport(value)) {
          output.replaceLeft(node.source.start + 1, node.source.start + 3, "/_file/");
        }
      }
    },
    ImportDeclaration(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        rootNode.async = true;
        output.replaceLeft(
          node.start,
          node.end,
          `const ${
            node.specifiers.some(isNotNamespaceSpecifier)
              ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
              : node.specifiers.some(isNamespaceSpecifier)
              ? node.specifiers.find(isNamespaceSpecifier).local.name
              : "{}"
          } = await import(${
            sourcePath && isLocalImport(value)
              ? JSON.stringify("/_file/" + getPathFromRoot(root, sourcePath, value).slice(root.length + 1))
              : node.source.raw
          });`
        );
      }
    }
  });
}

function rewriteImportSpecifier(node) {
  return node.type === "ImportDefaultSpecifier"
    ? `default: ${node.local.name}`
    : node.imported.name === node.local.name
    ? node.local.name
    : `${node.imported.name}: ${node.local.name}`;
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}
