import type {
  AnonymousFunctionDeclaration,
  ArrowFunctionExpression,
  BlockStatement,
  CatchClause,
  Class,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
  Pattern,
  Program
} from "acorn";
import {ancestor} from "acorn-walk";

// Based on https://github.com/ForbesLindesay/acorn-globals
// Copyright (c) 2014 Forbes Lindesay
// https://github.com/ForbesLindesay/acorn-globals/blob/master/LICENSE

type Func = FunctionExpression | FunctionDeclaration | ArrowFunctionExpression | AnonymousFunctionDeclaration;

function isScope(node: Node): node is Func | Program {
  return (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "Program"
  );
}

// prettier-ignore
function isBlockScope(node: Node): node is Func | Program | BlockStatement | ForInStatement | ForOfStatement | ForStatement {
  return (
    node.type === "BlockStatement" ||
    node.type === "SwitchStatement" ||
    node.type === "ForInStatement" ||
    node.type === "ForOfStatement" ||
    node.type === "ForStatement" ||
    isScope(node)
  );
}

export function findReferences(node: Node, globals: Set<string>): Node[] {
  const locals = new Map<Node, Set<string>>();
  const globalSet = new Set<string>(globals);
  const references: Node[] = [];

  function hasLocal(node: Node, name: string): boolean {
    const l = locals.get(node);
    return l ? l.has(name) : false;
  }

  function declareLocal(node: Node, id: {name: string}): void {
    const l = locals.get(node);
    if (l) l.add(id.name);
    else locals.set(node, new Set([id.name]));
  }

  function declareClass(node: Class) {
    if (node.id) declareLocal(node, node.id);
  }

  function declareFunction(node: Func) {
    node.params.forEach((param) => declarePattern(param, node));
    if (node.id) declareLocal(node, node.id);
    if (node.type !== "ArrowFunctionExpression") declareLocal(node, {name: "arguments"});
  }

  function declareCatchClause(node: CatchClause) {
    if (node.param) declarePattern(node.param, node);
  }

  function declarePattern(node: Pattern, parent: Node) {
    switch (node.type) {
      case "Identifier":
        declareLocal(parent, node);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) => declarePattern(node.type === "Property" ? node.value : node, parent));
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && declarePattern(node, parent));
        break;
      case "RestElement":
        declarePattern(node.argument, parent);
        break;
      case "AssignmentPattern":
        declarePattern(node.left, parent);
        break;
      case "MemberExpression":
        // ignored
        break;
    }
  }

  ancestor(node, {
    VariableDeclaration(node, state, parents) {
      let parent: Node | null = null;
      for (let i = parents.length - 1; i >= 0 && parent === null; --i) {
        if (node.kind === "var" ? isScope(parents[i]) : isBlockScope(parents[i])) {
          parent = parents[i];
        }
      }
      node.declarations.forEach((declaration) => declarePattern(declaration.id, parent!));
    },
    FunctionDeclaration(node, state, parents) {
      let parent: Node | null = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      if (node.id) declareLocal(parent!, node.id);
      declareFunction(node);
    },
    FunctionExpression: declareFunction,
    ArrowFunctionExpression: declareFunction,
    ClassDeclaration(node, state, parents) {
      let parent: Node | null = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      if (node.id) declareLocal(parent!, node.id);
    },
    ClassExpression: declareClass,
    CatchClause: declareCatchClause,
    ImportDeclaration(node, state, [root]) {
      node.specifiers.forEach((specifier) => declareLocal(root, specifier.local));
    }
  });

  function identifier(node: Identifier, state: never, parents: Node[]) {
    const name = node.name;
    if (name === "undefined") return;
    for (let i = parents.length - 2; i >= 0; --i) {
      if (hasLocal(parents[i], name)) {
        return;
      }
    }
    if (!globalSet.has(name)) {
      references.push(node);
    }
  }

  ancestor(node, {
    Pattern(node, state, parents) {
      if (node.type === "Identifier") {
        identifier(node, state, parents);
      }
    },
    Identifier: identifier
  });

  return references;
}
