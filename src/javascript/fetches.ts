import {simple} from "acorn-walk";
import {type JavaScriptNode} from "../javascript.js";
import {type Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isLocalFetch} from "./features.js";

export function rewriteFetches(output: Sourcemap, rootNode: JavaScriptNode, sourcePath: string): void {
  simple(rootNode.body, {
    CallExpression(node) {
      if (isLocalFetch(node, rootNode.references, sourcePath)) {
        const arg = node.arguments[0];
        const value = getStringLiteralValue(arg);
        const path = relativeUrl(sourcePath, resolvePath(sourcePath, value));
        output.replaceLeft(arg.start, arg.end, JSON.stringify(path));
      }
    }
  });
}
