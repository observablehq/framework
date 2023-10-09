import {ancestor, simple} from "acorn-walk";
import {syntaxError} from "./syntaxError.js";

// Based on https://github.com/ForbesLindesay/acorn-globals
// Copyright (c) 2014 Forbes Lindesay
// https://github.com/ForbesLindesay/acorn-globals/blob/master/LICENSE

function isScope(node) {
  return (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "Program"
  );
}

function isBlockScope(node) {
  return (
    node.type === "BlockStatement" ||
    node.type === "ForInStatement" ||
    node.type === "ForOfStatement" ||
    node.type === "ForStatement" ||
    isScope(node)
  );
}

export function findReferences(node, globals, input) {
  const locals = new Map();
  const globalSet = new Set(globals);
  const references = [];

  function hasLocal(node, name) {
    const l = locals.get(node);
    return l ? l.has(name) : false;
  }

  function declareLocal(node, id) {
    const l = locals.get(node);
    if (l) l.add(id.name);
    else locals.set(node, new Set([id.name]));
  }

  function declareClass(node) {
    if (node.id) declareLocal(node, node.id);
  }

  function declareFunction(node) {
    node.params.forEach((param) => declarePattern(param, node));
    if (node.id) declareLocal(node, node.id);
    if (node.type !== "ArrowFunctionExpression") declareLocal(node, {name: "arguments"});
  }

  function declareCatchClause(node) {
    if (node.param) declarePattern(node.param, node);
  }

  function declarePattern(node, parent) {
    switch (node.type) {
      case "Identifier":
        declareLocal(parent, node);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) => declarePattern(node, parent));
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && declarePattern(node, parent));
        break;
      case "Property":
        declarePattern(node.value, parent);
        break;
      case "RestElement":
        declarePattern(node.argument, parent);
        break;
      case "AssignmentPattern":
        declarePattern(node.left, parent);
        break;
      default:
        throw new Error("Unrecognized pattern type: " + node.type);
    }
  }

  function declareImportSpecifier(node, parent) {
    switch (node.type) {
      case "ImportSpecifier":
      case "ImportNamespaceSpecifier":
      case "ImportDefaultSpecifier":
        declareLocal(parent, node.local);
        break;
      default:
        throw new Error("Unrecognized import type: " + node.type);
    }
  }

  ancestor(node, {
    VariableDeclaration(node, parents) {
      let parent = null;
      for (let i = parents.length - 1; i >= 0 && parent === null; --i) {
        if (node.kind === "var" ? isScope(parents[i]) : isBlockScope(parents[i])) {
          parent = parents[i];
        }
      }
      node.declarations.forEach((declaration) => declarePattern(declaration.id, parent));
    },
    FunctionDeclaration(node, parents) {
      let parent = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      declareLocal(parent, node.id);
      declareFunction(node);
    },
    Function: declareFunction,
    ClassDeclaration(node, parents) {
      let parent = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; i--) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      declareLocal(parent, node.id);
    },
    Class: declareClass,
    CatchClause: declareCatchClause,
    ImportDeclaration(node, [root]) {
      node.specifiers.forEach((specifier) => declareImportSpecifier(specifier, root));
    }
  });

  function identifier(node, parents) {
    let name = node.name;
    if (name === "undefined") return;
    for (let i = parents.length - 2; i >= 0; --i) {
      if (hasLocal(parents[i], name)) {
        node.declarationDepth = i; // TODO link to declaration?
        return;
      }
    }
    if (!globalSet.has(name)) {
      references.push(node);
    }
  }

  ancestor(node, {
    VariablePattern: identifier,
    Identifier: identifier
  });

  function checkConst(node) {
    switch (node?.type) {
      case "Identifier":
      case "VariablePattern": {
        if (references.includes(node)) throw syntaxError(`Assignment to external variable '${node.name}'`, node, input);
        if (globals.has(node.name)) throw syntaxError(`Assignment to global '${node.name}'`, node, input);
        break;
      }
      case "ArrayPattern": {
        for (const element of node.elements) checkConst(element);
        break;
      }
      case "ObjectPattern": {
        for (const property of node.properties) checkConst(property);
        break;
      }
      case "Property": {
        checkConst(node.value);
        break;
      }
      case "RestElement": {
        checkConst(node.argument);
        break;
      }
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

  return references;
}
