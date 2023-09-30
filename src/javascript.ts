import type {Options} from "acorn";
import {Parser, tokTypes} from "acorn";
import {findAssignments} from "./javascript/assignments.js";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findReferences} from "./javascript/references.js";
import {Sourcemap} from "./sourcemap.js";

export function transpileJavaScript(input: string, id: number, options: ParseOptions = {}): string {
  try {
    const node = parseJavaScript(input, options);
    const inputs = Array.from(new Set(node.references.map((r) => r.name)));
    if (node.expression && !inputs.includes("display")) (input = `display((\n${input}\n))`), inputs.push("display");
    const body = new Sourcemap(input);
    if (node.assignments) {
      for (const assignment of node.assignments) {
        switch (assignment.type) {
          case "VariableDeclarator":
            body.insertLeft(assignment.init.start, `(exports.${assignment.id.name} = `);
            body.insertRight(assignment.init.end, `)`);
            break;
          case "AssignmentExpression":
            body.insertLeft(assignment.right.start, `(exports.${assignment.left.name} = `);
            body.insertRight(assignment.right.end, `)`);
            break;
          default:
            throw new Error(`unknown assignment type: ${assignment.type}`);
        }
      }
    }
    return `
define({id: ${id}, inputs: ${JSON.stringify(inputs)}, outputs: ${JSON.stringify(
      node.declarations?.map(({name}) => name) ?? []
    )}, body: ${node.async ? "async " : ""}(${inputs}) => {${node.declarations?.length ? "\nconst exports = {};" : ""}
${String(body).trim()}${node.declarations?.length ? "\nreturn exports;" : ""}
}});
`;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return `
define({id: ${id}, inputs: [], outputs: [], body: () => { throw new SyntaxError(${JSON.stringify(error.message)}); }});
`;
  }
}

export interface ParseOptions {
  allowProgram?: boolean;
}

export function parseJavaScript(
  input: string,
  {
    globals = defaultGlobals,
    allowProgram = true,
    ...otherOptions
  }: Partial<Options> & ParseOptions & {globals?: Set<string>} = {}
) {
  const options: Options = {...otherOptions, ecmaVersion: 13, sourceType: "module"};
  // First attempt to parse as an expression; if this fails, parse as a program.
  const expression = maybeParseExpression(input, options);
  if (!expression && !allowProgram) throw new SyntaxError("invalid expression");
  const body = expression ?? (Parser.parse(input, options) as any);
  const references = findReferences(body, globals, input);
  const declarations = expression ? null : findDeclarations(body, globals, input);
  const assignments = expression ? null : findAssignments(body);
  return {
    body,
    declarations,
    assignments,
    references,
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
