import {simple} from "acorn-walk";
import {isLocalFetch} from "./features.js";

export function rewriteFetches(output, root) {
  simple(root.body, {
    CallExpression(node) {
      if (isLocalFetch(node, root.references)) {
        output.insertLeft(node.arguments[0].start + 3, "_file/");
      }
    }
  });
}
