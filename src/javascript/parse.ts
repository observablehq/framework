import {Parser, tokTypes} from "acorn";
import type {Expression, Identifier, Options, Program} from "acorn";
import {checkAssignments} from "./assignments.js";
import {findAwaits} from "./awaits.js";
import {findDeclarations} from "./declarations.js";
import type {FileExpression} from "./files.js";
import {findFiles} from "./files.js";
import type {ImportReference} from "./imports.js";
import {findExports, findImports} from "./imports.js";
import {findReferences} from "./references.js";
import {syntaxError} from "./syntaxError.js";

export interface ParseOptions {
  /** The path to the source within the source root. */
  path: string;
  /** If true, treat the input as an inline expression instead of a fenced code block. */
  inline?: boolean;
}

export const parseOptions: Options = {
  ecmaVersion: 13,
  sourceType: "module"
};

export interface JavaScriptNode {
  body: Program | Expression;
  declarations: Identifier[] | null; // null for expressions that can’t declare top-level variables, a.k.a outputs
  references: Identifier[]; // the unbound references, a.k.a. inputs
  files: FileExpression[];
  imports: ImportReference[];
  expression: boolean; // is this an expression or a program cell?
  async: boolean; // does this use top-level await?
  inline: boolean;
  input: string;
}

/**
 * Parses the specified JavaScript code block, or if the inline option is true,
 * the specified inline JavaScript expression.
 */
export function parseJavaScript(input: string, options: ParseOptions): JavaScriptNode {
  const {inline = false, path} = options;
  let expression = maybeParseExpression(input, parseOptions); // first attempt to parse as expression
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // treat named function as program
  if (!expression && inline) throw new SyntaxError("invalid expression"); // inline code must be an expression
  const body = expression ?? Parser.parse(input, parseOptions); // otherwise parse as a program
  const exports = findExports(body);
  if (exports.length) throw syntaxError("Unexpected token 'export'", exports[0], input); // disallow exports
  const references = findReferences(body);
  checkAssignments(body, references, input);
  return {
    body,
    declarations: expression ? null : findDeclarations(body as Program, input),
    references,
    files: findFiles(body, path, input, ["FileAttachment"]),
    imports: findImports(body, path, input),
    expression: !!expression,
    async: findAwaits(body).length > 0,
    inline,
    input
  };
}

/**
 * Parses a single expression; like parseExpressionAt, but returns null if
 * additional input follows the expression.
 */
function maybeParseExpression(input: string, options: Options): Expression | null {
  const parser = new (Parser as any)(options, input, 0); // private constructor
  parser.nextToken();
  try {
    const node = parser.parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
