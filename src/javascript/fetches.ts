import {dirname, join} from "node:path";
import {simple} from "acorn-walk";
import {relativeUrl} from "../url.js";
import {getStringLiteralValue, isLocalFetch} from "./features.js";

export function rewriteFetches(output, rootNode, sourcePath) {
  simple(rootNode.body, {
    CallExpression(node) {
      if (isLocalFetch(node, rootNode.references, sourcePath)) {
        const arg = node.arguments[0];
        const value = relativeUrl(sourcePath, "/_file/" + join(dirname(sourcePath), getStringLiteralValue(arg)));
        output.replaceLeft(arg.start, arg.end, JSON.stringify(value));
      }
    }
  });
}
