import {simple} from "acorn-walk";

export function findAssignments(node) {
  if (node.type !== "Program") throw new Error(`unexpected type: ${node.type}`);

  const assignments = [];

  for (const child of node.body) {
    switch (child.type) {
      case "VariableDeclaration":
        for (const declaration of child.declarations) if (declaration.init) assignments.push(declaration);
        break;
      case "ClassDeclaration":
      case "FunctionDeclaration":
        assignments.push(child);
        break;
      case "ImportDefaultSpecifier":
      case "ImportSpecifier":
      case "ImportNamespaceSpecifier":
        throw new Error(`import not yet implemented: ${child.type}`);
      case "Class":
      case "Function":
        throw new Error(`unexpected type: ${child.type}`);
    }
  }

  function checkAssignment(node, parent) {
    switch (node?.type) {
      case "Identifier":
      case "VariablePattern": {
        if (node.declarationDepth === 0) assignments.push(parent);
        break;
      }
      case "ArrayPattern": {
        for (const element of node.elements) checkAssignment(element, node);
        break;
      }
      case "ObjectPattern": {
        for (const property of node.properties) checkAssignment(property, node);
        break;
      }
      case "Property": {
        checkAssignment(node.value, node);
        break;
      }
      case "RestElement": {
        checkAssignment(node.argument, node);
        break;
      }
    }
  }

  simple(node, {
    AssignmentExpression(node) {
      checkAssignment(node.left, node);
    },
    AssignmentPattern(node) {
      checkAssignment(node.left, node);
    },
    UpdateExpression(node) {
      checkAssignment(node.argument, node);
    },
    ForOfStatement(node) {
      checkAssignment(node.left, node);
    },
    ForInStatement(node) {
      checkAssignment(node.left, node);
    }
  });

  return assignments;
}
