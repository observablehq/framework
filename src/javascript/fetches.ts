import {simple} from "acorn-walk";
import {isLocalFetch} from "./features.js";

export function rewriteFetches(output, rootNode, sourcePath) {
  simple(rootNode.body, {
    CallExpression(node) {
      if (isLocalFetch(node, rootNode.references, sourcePath)) {
        output.insertLeft(node.arguments[0].start + 3, "_file/");
      }
    }
  });
}
