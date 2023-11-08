import {Parser, type Node} from "acorn";
import {simple} from "acorn-walk";
import {readFileSync} from "node:fs";
import {dirname, join, normalize} from "node:path";
import {parseOptions, type ImportReference, type JavaScriptNode} from "../javascript.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

export function findImports(body: Node, root: string, sourcePath: string) {
  const imports: ImportReference[] = [];
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
      if (isLocalImport(value, root, sourcePath)) {
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
    if (paths.has(path)) return;
    paths.add(path);
    imports.push({type: "local", name: path});
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
        if (isLocalImport(value, root, sourcePath)) {
          findLocalImports(join(path, value));
        } else {
          imports.push({name: value, type: "global"});
          // non-local imports don't need to be promoted to file attachments
        }
      }
    }
  }

  return imports;
}

// TODO parallelize multiple static imports
export function rewriteImports(output: any, rootNode: JavaScriptNode, root: string, sourcePath: string) {
  simple(rootNode.body, {
    ImportExpression(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        output.replaceLeft(
          node.source.start,
          node.source.end,
          JSON.stringify(
            isLocalImport(value, root, sourcePath)
              ? join("/_file/", join(dirname(sourcePath), value))
              : resolveImport(value)
          )
        );
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
          } = await import(${JSON.stringify(
            isLocalImport(value, root, sourcePath)
              ? join("/_file/", join(dirname(sourcePath), value))
              : resolveImport(value)
          )});`
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

export function isLocalImport(value: string, root: string, sourcePath: string): boolean {
  return (
    ["./", "../", "/"].some((prefix) => value.startsWith(prefix)) &&
    join(root + "/", dirname(sourcePath), value).startsWith(root)
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
