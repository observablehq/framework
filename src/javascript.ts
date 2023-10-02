import type {Options} from "acorn";
import {Parser, tokTypes} from "acorn";
import mime from "mime";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findReferences} from "./javascript/references.js";
import {findFeatures} from "./javascript/features.js";

export function transpileJavaScript(input: string, id: number, options: ParseOptions = {}): string {
  try {
    const node = parseJavaScript(input, options);
    const files = node.features.filter((d) => d.type === "FileAttachment");
    const inputs = Array.from(new Set(node.references.map((r) => r.name)));
    if (node.expression && !inputs.includes("display")) {
      input = `display((\n${input.trim()}\n))`;
      inputs.push("display");
    }
    return `define({id: ${id}${inputs.length ? `, inputs: ${JSON.stringify(inputs)}` : ""}${
      options.inline ? `, inline: true` : ""
    }${node.declarations?.length ? `, outputs: ${JSON.stringify(node.declarations.map(({name}) => name))}` : ""}${
      files.length ? `, files: ${JSON.stringify(files.map((f) => ({name: f.name, mimeType: mime.getType(f.name)})))}` : ""
    }, body: ${node.async ? "async " : ""}(${inputs}) => {
${input.trim()}${node.declarations?.length ? `\nreturn {${node.declarations.map(({name}) => name)}};` : ""}
}});
`;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return `define({id: ${id}, body: () => { throw new SyntaxError(${JSON.stringify(error.message)}); }});
`;
  }
}

export interface ParseOptions {
  inline?: boolean;
}

export function parseJavaScript(
  input: string,
  {
    globals = defaultGlobals,
    inline = false,
    ...otherOptions
  }: Partial<Options> & ParseOptions & {globals?: Set<string>} = {}
) {
  const options: Options = {...otherOptions, ecmaVersion: 13, sourceType: "module"};
  // First attempt to parse as an expression; if this fails, parse as a program.
  let expression = maybeParseExpression(input, options);
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // treat named function as program
  if (!expression && inline) throw new SyntaxError("invalid expression");
  const body = expression ?? (Parser.parse(input, options) as any);
  const references = findReferences(body, globals, input);
  const declarations = expression ? null : findDeclarations(body, globals, input);
  const features = findFeatures(body, references, input);
  return {
    body,
    declarations,
    references,
    features,
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

// Parses a single expression; like parseExpressionAt, but returns null if
// additional input follows the expression.
function maybeParseExpression(input, options) {
  const parser = new Parser(options, input, 0);
  parser.nextToken();
  try {
    const node = (parser as any).parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
