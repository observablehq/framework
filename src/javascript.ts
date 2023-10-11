import {Parser, tokTypes, type Options} from "acorn";
import mime from "mime";
import {join} from "node:path";
import {canReadSync} from "./files.js";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {findFeatures} from "./javascript/features.js";
import {rewriteFetches} from "./javascript/fetches.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findImports, rewriteImports} from "./javascript/imports.js";
import {findReferences} from "./javascript/references.js";
import {Sourcemap} from "./sourcemap.js";

export interface FileReference {
  name: string;
  mimeType: string;
}

export interface ImportReference {
  name: string;
}

export interface Transpile {
  id: string;
  inputs?: string[];
  outputs?: string[];
  inline?: boolean;
  body: string;
  files?: FileReference[];
  imports?: ImportReference[];
}

export interface TranspileOptions {
  id: number;
  root: string;
}

export function transpileJavaScript(input: string, {id, root, ...options}: TranspileOptions & ParseOptions): Transpile {
  try {
    const node = parseJavaScript(input, options);
    const files = node.features
      .filter((f) => f.type === "FileAttachment")
      .filter((f) => canReadSync(join(root, f.name)))
      .map((f) => ({name: f.name, mimeType: mime.getType(f.name)}));
    const inputs = Array.from(new Set<string>(node.references.map((r) => r.name)));
    const output = new Sourcemap(input);
    trim(output, input);
    if (node.expression && !inputs.includes("display")) {
      output.insertLeft(0, "display((\n");
      output.insertRight(input.length, "\n))");
      inputs.push("display");
    }
    rewriteImports(output, node);
    rewriteFetches(output, node);
    return {
      id: `${id}`,
      ...(inputs.length ? {inputs} : null),
      ...(options.inline ? {inline: true} : null),
      ...(node.declarations?.length ? {outputs: node.declarations.map(({name}) => name)} : null),
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
    console.error(`${error.name}: ${message}`);
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

export interface ParseOptions {
  inline?: boolean;
  sourceLine?: number;
}

export function parseJavaScript(
  input: string,
  {globals = defaultGlobals, inline = false}: Partial<Options> & ParseOptions & {globals?: Set<string>} = {}
) {
  const options: Options = {ecmaVersion: 13, sourceType: "module"};
  // First attempt to parse as an expression; if this fails, parse as a program.
  let expression = maybeParseExpression(input, options);
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // treat named function as program
  if (!expression && inline) throw new SyntaxError("invalid expression");
  const body = expression ?? (Parser.parse(input, options) as any);
  const references = findReferences(body, globals, input);
  const declarations = expression ? null : findDeclarations(body, globals, input);
  const features = findFeatures(body, references, input);
  const imports = findImports(body);
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
  const parser = new Parser(options, input, 0);
  parser.nextToken();
  try {
    const node = (parser as any).parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
