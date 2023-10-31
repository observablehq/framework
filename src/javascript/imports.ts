import {Parser} from "acorn";
import type {Node} from "acorn";
import {simple} from "acorn-walk";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {type JavaScriptNode, parseOptions} from "../javascript.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

export function findImports(body: Node, root, sourcePath: string) {
  const imports: {name: string; type: "global" | "local"}[] = [];
  const features: {name: string; type: string}[] = [];
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
        findLocalImports(join(dirname(sourcePath), value));
      } else {
        imports.push({name: value, type: "global"});
      }
    }
  }

  // If this is an import of a local ES module, recursively parse the module to
  // find transitive imports.
  function findLocalImports(path) {
    if (paths.has(path)) return;
    paths.add(path);
    imports.push({type: "local", name: path});
    features.push({type: "FileAttachment", name: path});
    try {
      const input = readFileSync(join(root, path), "utf-8");
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
        } else {
          imports.push({name: value, type: "global"});
          // non-local imports don't need to be promoted to file attachments
        }
      }
    }
  }

  return {imports, features};
}

// TODO parallelize multiple static imports
export function rewriteImports(output: any, rootNode: JavaScriptNode, sourcePath: string) {
  simple(rootNode.body, {
    ImportExpression(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
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
            isLocalImport(value) ? JSON.stringify(join("/_file/", join(dirname(sourcePath), value))) : node.source.raw
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

export function isLocalImport(value) {
  return ["./", "../", "/"].some((prefix) => value.startsWith(prefix));
}

function isNamespaceSpecifier(node) {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(node) {
  return node.type !== "ImportNamespaceSpecifier";
}
