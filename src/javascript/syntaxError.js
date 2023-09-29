import {getLineInfo} from "acorn";

export function syntaxError(message, node, input) {
  const loc = getLineInfo(input, node.start);
  const error = new SyntaxError(message + ` (${loc.line}:${loc.column})`);
  error.pos = node.start;
  error.loc = loc;
  return error;
}
