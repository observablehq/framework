import {syntaxError} from "./syntaxError.js";

export function findDeclarations(node, globals, input) {
  if (node.type !== "Program") throw new Error(`unexpected type: ${node.type}`);

  const declarations = [];

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
      default:
        throw new Error("Unrecognized pattern type: " + node.type);
    }
  }

  function declareImportSpecifier(node) {
    switch (node.type) {
      case "ImportSpecifier":
      case "ImportNamespaceSpecifier":
      case "ImportDefaultSpecifier":
        declareLocal(node.local);
        break;
      default:
        throw new Error("Unrecognized import type: " + node.type);
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
      case "Class":
      case "Function":
        throw new Error(`unexpected type: ${child.type}`);
    }
  }

  return declarations;
}
