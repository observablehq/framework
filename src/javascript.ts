import {Parser, tokTypes} from "acorn";
import type {Expression, Identifier, Node, Options, Program} from "acorn";
import {fileReference} from "./files.js";
import {findAssignments} from "./javascript/assignments.js";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {findFeatures} from "./javascript/features.js";
import {findExports, findImportDeclarations, findImports} from "./javascript/imports.js";
import {createImportResolver, rewriteImports} from "./javascript/imports.js";
import {findReferences} from "./javascript/references.js";
import {syntaxError} from "./javascript/syntaxError.js";
import {Sourcemap} from "./sourcemap.js";
import {red} from "./tty.js";

export interface FileReference {
  /** The relative path from the page to the original file (e.g., "./test.txt"). */
  name: string;
  /** The MIME type, if known; derived from the file extension. */
  mimeType: string | null;
  /** The relative path from the page to the file in _file (e.g., "../_file/sub/test.txt"). */
  path: string;
}

export interface ImportReference {
  name: string;
  type: "global" | "local";
}

export interface Feature {
  type: "FileAttachment";
  name: string;
}

export interface BaseTranspile {
  id: string;
  expression: boolean;
  inputs?: string[];
  outputs?: string[];
  inline?: boolean;
  files?: FileReference[];
  imports?: ImportReference[];
}

export interface PendingTranspile extends BaseTranspile {
  body: () => Promise<string>;
}

export interface Transpile extends BaseTranspile {
  body: string;
}

export interface ParseOptions {
  id: string;
  root: string;
  sourcePath: string;
  inline?: boolean;
  sourceLine?: number;
  globals?: Set<string>;
  verbose?: boolean;
}

export function transpileJavaScript(input: string, options: ParseOptions): PendingTranspile {
  const {id, root, sourcePath, verbose = true} = options;
  try {
    const node = parseJavaScript(input, options);
    const files = node.features
      .filter((f) => f.type === "FileAttachment")
      .map(({name}) => fileReference(name, sourcePath));
    const inputs = Array.from(new Set<string>(node.references.map((r) => r.name)));
    const implicitDisplay = node.expression && !inputs.includes("display") && !inputs.includes("view");
    if (implicitDisplay) inputs.push("display"), (node.async = true);
    if (findImportDeclarations(node).length > 0) node.async = true;
    return {
      id,
      expression: node.expression,
      ...(inputs.length ? {inputs} : null),
      ...(options.inline ? {inline: true} : null),
      ...(node.declarations?.length ? {outputs: node.declarations.map(({name}) => name)} : null),
      ...(files.length ? {files} : null),
      body: async () => {
        const output = new Sourcemap(input);
        output.trim();
        if (implicitDisplay) {
          output.insertLeft(0, "display(await(\n");
          output.insertRight(input.length, "\n))");
        }
        await rewriteImports(output, node, sourcePath, createImportResolver(root, "_import"));
        const result = `${node.async ? "async " : ""}(${inputs}) => {
${String(output)}${node.declarations?.length ? `\nreturn {${node.declarations.map(({name}) => name)}};` : ""}
}`;
        return result;
      },
      ...(node.imports.length ? {imports: node.imports} : null)
    };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const message = error.message;
    // TODO: Consider showing a code snippet along with the error. Also, consider
    // whether we want to show the file name here.
    if (verbose) {
      let warning = error.message;
      const match = /^(.+)\s\((\d+):(\d+)\)$/.exec(message);
      if (match) {
        const line = +match[2] + (options?.sourceLine ?? 0);
        const column = +match[3] + 1;
        warning = `${match[1]} at line ${line}, column ${column}`;
      } else if (options?.sourceLine) {
        warning = `${message} at line ${options.sourceLine + 1}`;
      }
      console.error(red(`${error.name}: ${warning}`));
    }
    return {
      id,
      expression: true,
      body: async () => `() => { throw new SyntaxError(${JSON.stringify(message)}); }`
    };
  }
}

export const parseOptions: Options = {ecmaVersion: 13, sourceType: "module"};

export interface JavaScriptNode {
  body: Node;
  declarations: Identifier[] | null; // null for expressions that can’t declare top-level variables, a.k.a outputs
  references: Identifier[]; // the unbound references, a.k.a. inputs
  features: Feature[];
  imports: ImportReference[];
  expression: boolean; // is this an expression or a program cell?
  async: boolean; // does this use top-level await?
}

function parseJavaScript(input: string, options: ParseOptions): JavaScriptNode {
  const {inline = false, root, sourcePath} = options;
  // First attempt to parse as an expression; if this fails, parse as a program.
  let expression = maybeParseExpression(input, parseOptions);
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // treat named function as program
  if (!expression && inline) throw new SyntaxError("invalid expression");
  const body = expression ?? Parser.parse(input, parseOptions);
  const exports = findExports(body);
  if (exports.length) throw syntaxError("Unexpected token 'export'", exports[0], input); // disallow exports
  const references = findReferences(body);
  findAssignments(body, references, input);
  const declarations = expression ? null : findDeclarations(body as Program, input);
  const {imports, features: importedFeatures} = findImports(body, root, sourcePath);
  const features = findFeatures(body, sourcePath, references, input);
  return {
    body,
    declarations,
    references,
    features: [...features, ...importedFeatures],
    imports,
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

// Parses a single expression; like parseExpressionAt, but returns null if
// additional input follows the expression.
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
