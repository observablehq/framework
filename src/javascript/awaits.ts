import type {Node} from "acorn";
import {recursive} from "acorn-walk";

export function findAwaits(node: Node): Node[] {
  const nodes: Node[] = [];

  recursive(node, null, {
    FunctionDeclaration() {},
    FunctionExpression() {},
    ArrowFunctionExpression() {},
    ForOfStatement(node) {
      if (node.await) nodes.push(node);
    },
    AwaitExpression(node) {
      nodes.push(node);
    }
  });

  return nodes;
}
