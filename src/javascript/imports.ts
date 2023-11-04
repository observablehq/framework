import {Parser} from "acorn";
import {simple} from "acorn-walk";
import {readFileSync} from "node:fs";
import {dirname, join, relative, resolve} from "node:path";
import {parseOptions} from "../javascript.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

export function findImports(body, root) {
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
      if (value.startsWith("./")) findLocalImports(join(root, value));
      imports.push({name: value});
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
        if (value.startsWith("./")) {
          const subpath = resolve(dirname(path), value);
          findLocalImports(subpath);
          imports.push({name: `./${relative(root, subpath)}`});
        } else {
          imports.push({name: value});
        }
      }
    }
  }

  return imports;
}

// TODO parallelize multiple static imports
// TODO need to know the local path of the importing notebook; this assumes it’s in the root
export function rewriteImports(output, root) {
  simple(root.body, {
    ImportExpression(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        output.replaceLeft(
          node.source.start,
          node.source.end,
          JSON.stringify(value.startsWith("./") ? `/_file/${value.slice(2)}` : resolveImport(value))
        );
      }
    },
    ImportDeclaration(node: any) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        root.async = true;
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
            value.startsWith("./") ? `/_file/${value.slice(2)}` : resolveImport(value)
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
    : `https://cdn.jsdelivr.net/npm/${specifier.slice(4)}/+esm`;
}
