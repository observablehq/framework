import {simple} from "acorn-walk";
import {getStringLiteralValue, isStringLiteral} from "./features.js";

export function rewriteImports(output, node) {
  simple(node.body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        const value = getStringLiteralValue(node.source);
        if (value.startsWith("./")) {
          output.insertLeft(node.source.start + 3, "_file/");
        }
      }
    }
  });
}
