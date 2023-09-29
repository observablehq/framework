import {syntaxError} from "./syntaxError.js";

export function findImports(program, input) {
  const node = program.body.find(isExport);
  if (node) throw syntaxError("Illegal export declaration", node, input);
  return program.body.filter(isImport);
}

function isImport(node) {
  return node.type === "ImportDeclaration";
}

function isExport(node) {
  return (
    node.type === "ExportNamedDeclaration" ||
    node.type === "ExportDefaultDeclaration" ||
    node.type === "ExportAllDeclaration"
  );
}
