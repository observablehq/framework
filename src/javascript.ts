import {type Identifier, type Node, type Options, Parser, tokTypes} from "acorn";
import {fileReference} from "./files.js";
import {findAssignments} from "./javascript/assignments.js";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {findFeatures} from "./javascript/features.js";
import {rewriteFetches} from "./javascript/fetches.js";
import {defaultGlobals} from "./javascript/globals.js";
import {createImportResolver, findExports, findImports, rewriteImports} from "./javascript/imports.js";
import {findReferences} from "./javascript/references.js";
import {syntaxError} from "./javascript/syntaxError.js";
import {Sourcemap} from "./sourcemap.js";

export interface DatabaseReference {
  name: string;
}

export interface FileReference {
  name: string;
  mimeType: string | null;
  /** The relative path from the document to the file in _file */
  path: string;
}

export interface ImportReference {
  name: string;
  type: "global" | "local";
}

export interface Feature {
  type: "FileAttachment" | "DatabaseClient" | "Secret";
  name: string;
}

export interface Transpile {
  id: string;
  inputs?: string[];
  outputs?: string[];
  inline?: boolean;
  body: string;
  databases?: DatabaseReference[];
  files?: FileReference[];
  imports?: ImportReference[];
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

export function transpileJavaScript(input: string, options: ParseOptions): Transpile {
  const {id, root, sourcePath, verbose = true} = options;
  try {
    const node = parseJavaScript(input, options);
    const databases = node.features
      .filter((f) => f.type === "DatabaseClient")
      .map((f): DatabaseReference => ({name: f.name}));
    const files = node.features
      .filter((f) => f.type === "FileAttachment")
      .map(({name}) => fileReference(name, sourcePath));
    const inputs = Array.from(new Set<string>(node.references.map((r) => r.name)));
    const output = new Sourcemap(input);
    trim(output, input);
    if (node.expression && !inputs.includes("display") && !inputs.includes("view")) {
      output.insertLeft(0, "display((\n");
      output.insertRight(input.length, "\n))");
      inputs.push("display");
    }
    rewriteImports(output, node, sourcePath, createImportResolver(root, "_import"));
    rewriteFetches(output, node, sourcePath);
    return {
      id,
      ...(inputs.length ? {inputs} : null),
      ...(options.inline ? {inline: true} : null),
      ...(node.declarations?.length ? {outputs: node.declarations.map(({name}) => name)} : null),
      ...(databases.length ? {databases} : null),
      ...(files.length ? {files} : null),
      body: `${node.async ? "async " : ""}(${inputs}) => {
${String(output)}${node.declarations?.length ? `\nreturn {${node.declarations.map(({name}) => name)}};` : ""}
}`,
      ...(node.imports.length ? {imports: node.imports} : null)
    };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    let message = error.message;
    const match = /^(.+)\s\((\d+):(\d+)\)$/.exec(message);
    if (match) {
      const line = +match[2] + (options?.sourceLine ?? 0);
      const column = +match[3] + 1;
      message = `${match[1]} at line ${line}, column ${column}`;
    } else if (options?.sourceLine) {
      message = `${message} at line ${options.sourceLine + 1}`;
    }
    // TODO: Consider showing a code snippet along with the error. Also, consider
    // whether we want to show the file name here.
    if (verbose) console.error(`${error.name}: ${message}`);
    return {
      id: `${id}`,
      body: `() => { throw new SyntaxError(${JSON.stringify(error.message)}); }`
    };
  }
}

function trim(output: Sourcemap, input: string): void {
  if (input.startsWith("\n")) output.delete(0, 1); // TODO better trim
  if (input.endsWith("\n")) output.delete(input.length - 1, input.length); // TODO better trim
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
  const {globals = defaultGlobals, inline = false, root, sourcePath} = options;
  // First attempt to parse as an expression; if this fails, parse as a program.
  let expression = maybeParseExpression(input, parseOptions);
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // treat named function as program
  if (!expression && inline) throw new SyntaxError("invalid expression");
  const body = expression ?? (Parser.parse(input, parseOptions) as any);
  const exports = findExports(body);
  if (exports.length) throw syntaxError("Unexpected token 'export'", exports[0], input); // disallow exports
  const references = findReferences(body, globals);
  findAssignments(body, references, globals, input);
  const declarations = expression ? null : findDeclarations(body, globals, input);
  const imports = findImports(body, root, sourcePath);
  const features = findFeatures(body, root, sourcePath, references, input);
  return {
    body,
    declarations,
    references,
    features,
    imports,
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

// Parses a single expression; like parseExpressionAt, but returns null if
// additional input follows the expression.
function maybeParseExpression(input, options) {
  const parser = new (Parser as any)(options, input, 0); // private constructor
  parser.nextToken();
  try {
    const node = (parser as any).parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
