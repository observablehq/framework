import type {Options} from "acorn";
import {Parser} from "acorn";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findReferences} from "./javascript/references.js";

export function transpileJavaScript(input: string, id: string): string {
  try {
    const node = parseJavaScript(input);
    const inputs = Array.from(new Set(node.references.map((r) => r.name)));
    return `
main
  .variable(new Inspector(document.querySelector("#${id}")))
  .define(${JSON.stringify(inputs)}, (${inputs}) => (\n${input}\n));
`;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return `
main
  .variable(new Inspector(document.querySelector("#${id}")))
  .define(() => { throw new SyntaxError(${JSON.stringify(error.message)}); });
`;
  }
}

export function parseJavaScript(
  input: string,
  {globals = defaultGlobals, ...otherOptions}: Partial<Options> & {globals?: Set<string>} = {}
) {
  const options: Options = {...otherOptions, ecmaVersion: 13, sourceType: "module"};

  // Parse the input as a program.
  let body = Parser.parse(input, options) as any;

  // If the program consists of a single expression statement, it is promoted to
  // an expression. (Note this means that {foo: 1} is parsed as a statement
  // rather than an object literal; we could fix that by trying to parse as an
  // expression first, if desired.) Only program cells are allowed to declare
  // variables and imports.
  let declarations;
  if (body.body.length === 1 && body.body[0].type === "ExpressionStatement") {
    body = body.body[0].expression;
  } else {
    declarations = findDeclarations(body, globals, input);
  }

  const async = findAwaits(body).length > 0;
  const references = findReferences(body, globals, input);

  return {
    body,
    declarations,
    references,
    async
  };
}
