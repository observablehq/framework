import type {Program} from "acorn";
import {syntaxError} from "./syntaxError.js";

export function findDeclarations(node: Program, globals, input) {
  const declarations: Node[] = [];

  function declareLocal(node) {
    if (globals.has(node.name) || node.name === "arguments") {
      throw syntaxError(`Global '${node.name}' cannot be redefined`, node, input);
    }
    declarations.push(node);
  }

  function declarePattern(node) {
    switch (node.type) {
      case "Identifier":
        declareLocal(node);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) => declarePattern(node));
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && declarePattern(node));
        break;
      case "Property":
        declarePattern(node.value);
        break;
      case "RestElement":
        declarePattern(node.argument);
        break;
      case "AssignmentPattern":
        declarePattern(node.left);
        break;
    }
  }

  function declareImportSpecifier(node) {
    switch (node.type) {
      case "ImportSpecifier":
      case "ImportNamespaceSpecifier":
      case "ImportDefaultSpecifier":
        declareLocal(node.local);
        break;
    }
  }

  for (const child of node.body) {
    switch (child.type) {
      case "VariableDeclaration":
        child.declarations.forEach((declaration) => declarePattern(declaration.id));
        break;
      case "ClassDeclaration":
      case "FunctionDeclaration":
        declareLocal(child.id);
        break;
      case "ImportDeclaration":
        child.specifiers.forEach((specifier) => declareImportSpecifier(specifier));
        break;
    }
  }

  return declarations;
}
