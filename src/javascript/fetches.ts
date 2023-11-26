import {simple} from "acorn-walk";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isLocalFetch} from "./features.js";

export function rewriteFetches(output, rootNode, sourcePath) {
  simple(rootNode.body, {
    CallExpression(node) {
      if (isLocalFetch(node, rootNode.references, sourcePath)) {
        const arg = node.arguments[0];
        const value = getStringLiteralValue(arg);
        const path = resolvePath("_file", sourcePath, value);
        output.replaceLeft(arg.start, arg.end, JSON.stringify(relativeUrl(sourcePath, path)));
      }
    }
  });
}
