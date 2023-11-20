import {dirname, join} from "node:path";
import {simple} from "acorn-walk";
import {relativeUrl} from "../url.js";
import {getStringLiteralValue, isLocalFetch} from "./features.js";

export function rewriteFetches(output, rootNode, sourcePath) {
  simple(rootNode.body, {
    CallExpression(node) {
      if (isLocalFetch(node, rootNode.references, sourcePath)) {
        const arg = node.arguments[0];
        const value = getStringLiteralValue(arg);
        const path = `/_file/${join(value.startsWith("/") ? "." : dirname(sourcePath), value)}`;
        output.replaceLeft(arg.start, arg.end, JSON.stringify(relativeUrl(sourcePath, path)));
      }
    }
  });
}
