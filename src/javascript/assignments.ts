import type {Expression, Node, Pattern, VariableDeclaration} from "acorn";
import {simple} from "acorn-walk";
import {syntaxError} from "./syntaxError.js";

export function findAssignments(node: Node, references: Node[], globals: Set<string>, input: string): void {
  function checkConst(node: Expression | Pattern | VariableDeclaration) {
    switch (node.type) {
      case "Identifier":
        if (references.includes(node)) throw syntaxError(`Assignment to external variable '${node.name}'`, node, input);
        if (globals.has(node.name)) throw syntaxError(`Assignment to global '${node.name}'`, node, input);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) => checkConst(node.type === "Property" ? node.value : node));
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && checkConst(node));
        break;
      case "RestElement":
        checkConst(node.argument);
        break;
    }
  }

  simple(node, {
    AssignmentExpression(node) {
      checkConst(node.left);
    },
    AssignmentPattern(node) {
      checkConst(node.left);
    },
    UpdateExpression(node) {
      checkConst(node.argument);
    },
    ForOfStatement(node) {
      checkConst(node.left);
    },
    ForInStatement(node) {
      checkConst(node.left);
    }
  });
}
