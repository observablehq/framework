import {simple} from "acorn-walk";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

// TODO parallelize multiple static imports
export function rewriteImports(output, root) {
  simple(root.body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        if (value.startsWith("./")) {
          output.insertLeft(node.source.start + 3, "_file/");
        }
      }
    },
    ImportDeclaration(node) {
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
          } = await import(${value.startsWith("./") ? JSON.stringify("./_file/" + value.slice(2)) : node.source.raw});`
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
