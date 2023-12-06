import type {Identifier, Pattern, Program} from "acorn";
import {defaultGlobals} from "./globals.js";
import {syntaxError} from "./syntaxError.js";

export function findDeclarations(node: Program, input: string): Identifier[] {
  const declarations: Identifier[] = [];

  function declareLocal(node: Identifier) {
    if (defaultGlobals.has(node.name) || node.name === "arguments") {
      throw syntaxError(`Global '${node.name}' cannot be redefined`, node, input);
    }
    declarations.push(node);
  }

  function declarePattern(node: Pattern) {
    switch (node.type) {
      case "Identifier":
        declareLocal(node);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) => declarePattern(node.type === "Property" ? node.value : node));
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && declarePattern(node));
        break;
      case "RestElement":
        declarePattern(node.argument);
        break;
      case "AssignmentPattern":
        declarePattern(node.left);
        break;
    }
  }

  for (const child of node.body) {
    switch (child.type) {
      case "VariableDeclaration":
        child.declarations.forEach((node) => declarePattern(node.id));
        break;
      case "ClassDeclaration":
      case "FunctionDeclaration":
        declareLocal(child.id);
        break;
      case "ImportDeclaration":
        child.specifiers.forEach((node) => declareLocal(node.local));
        break;
    }
  }

  return declarations;
}
