import {recursive} from "acorn-walk";

export function findAwaits(node) {
  const nodes = [];

  recursive(node, null, {
    Function() {}, // ignore anything inside a function
    AwaitExpression(node) {
      nodes.push(node);
    }
  });

  return nodes;
}
