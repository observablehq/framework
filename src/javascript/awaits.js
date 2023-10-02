import {recursive} from "acorn-walk";

export function findAwaits(node) {
  const nodes = [];

  recursive(node, null, {
    Function() {}, // ignore anything inside a function
    ForOfStatement(node) {
      if (node.await) nodes.push(node);
    },
    AwaitExpression(node) {
      nodes.push(node);
    }
  });

  return nodes;
}
