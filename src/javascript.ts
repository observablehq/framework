import type {Options} from "acorn";
import {Parser, tokTypes} from "acorn";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findReferences} from "./javascript/references.js";

export function transpileJavaScript(input: string, id: string): string {
  try {
    const node = parseJavaScript(input);
    const inputs = Array.from(new Set(node.references.map((r) => r.name)));
    if (node.expression && !inputs.includes("display")) (input = `display((\n${input}\n))`), inputs.push("display"); // implicit display
    return `
define(${JSON.stringify(id)}, ${JSON.stringify(inputs)}, ${node.async ? "async " : ""}(${inputs}) => {\n${input}\n});
`;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return `
define(${JSON.stringify(id)}, [], () => { throw new SyntaxError(${JSON.stringify(error.message)}); });
`;
  }
}

export function parseJavaScript(
  input: string,
  {globals = defaultGlobals, ...otherOptions}: Partial<Options> & {globals?: Set<string>} = {}
) {
  const options: Options = {...otherOptions, ecmaVersion: 13, sourceType: "module"};
  // First attempt to parse as an expression; if this fails, parse as a program.
  const expression = maybeParseExpression(input, options);
  const body = expression ?? (Parser.parse(input, options) as any);
  return {
    body,
    declarations: expression ? null : findDeclarations(body, globals, input),
    references: findReferences(body, globals, input),
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

// Parses a single expression; like parseExpressionAt, but returns null if
// additional input follows the expression.
function maybeParseExpression(input, options) {
  const parser = new Parser(options, input, 0);
  parser.nextToken();
  const node = (parser as any).parseExpression();
  return parser.type === tokTypes.eof ? node : null;
}
