import type {Node} from "acorn";
import {getLineInfo} from "acorn";

export function syntaxError(message: string, node: Node, input: string): SyntaxError {
  const {line, column} = getLineInfo(input, node.start);
  return new SyntaxError(`${message} (${line}:${column})`);
}
