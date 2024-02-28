import type {ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, Node} from "acorn";
import {Parser} from "acorn";
import {simple} from "acorn-walk";
import {resolveNpmImport} from "../npm.js";
import {isPathImport, relativePath, resolvePath} from "../path.js";
import {builtins, resolveImportPath} from "../resolvers.js";
import {Sourcemap} from "../sourcemap.js";
import {findFiles} from "./files.js";
import type {ExportNode, ImportNode} from "./imports.js";
import {hasImportDeclaration} from "./imports.js";
import type {StringLiteral} from "./node.js";
import {getStringLiteralValue, isStringLiteral} from "./node.js";
import type {JavaScriptNode} from "./parse.js";
import {parseOptions} from "./parse.js";

export interface TranspileOptions {
  id: string;
  resolveImport?: (specifier: string) => string;
  resolveDynamicImport?: (specifier: string) => string;
}

export function transpileJavaScript(
  node: JavaScriptNode,
  {id, resolveImport, resolveDynamicImport}: TranspileOptions
): string {
  let async = node.async;
  const inputs = Array.from(new Set<string>(node.references.map((r) => r.name)));
  const outputs = Array.from(new Set<string>(node.declarations?.map((r) => r.name)));
  const display = node.expression && !inputs.includes("display") && !inputs.includes("view");
  if (display) inputs.push("display"), (async = true);
  if (hasImportDeclaration(node.body)) async = true;
  const output = new Sourcemap(node.input).trim();
  rewriteImportDeclarations(output, node.body, resolveImport);
  rewriteImportExpressions(output, node.body, resolveDynamicImport);
  if (display) output.insertLeft(0, "display(await(\n").insertRight(node.input.length, "\n))");
  output.insertLeft(0, `, body: ${async ? "async " : ""}(${inputs}) => {\n`);
  if (outputs.length) output.insertLeft(0, `, outputs: ${JSON.stringify(outputs)}`);
  if (inputs.length) output.insertLeft(0, `, inputs: ${JSON.stringify(inputs)}`);
  if (node.inline) output.insertLeft(0, ", inline: true");
  output.insertLeft(0, `define({id: ${JSON.stringify(id)}`);
  if (outputs.length) output.insertRight(node.input.length, `\nreturn {${outputs}};`);
  output.insertRight(node.input.length, "\n}});\n");
  return String(output);
}

/** Rewrites import specifiers and FileAttachment calls in the specified ES module. */
export async function transpileModule(input: string, root: string, path: string, sourcePath = path): Promise<string> {
  const body = Parser.parse(input, parseOptions); // TODO ignore syntax error?
  const output = new Sourcemap(input);
  const imports: (ImportNode | ExportNode)[] = [];

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    imports.push(node);
  }

  for (const {name, node} of findFiles(body, sourcePath, input)) {
    const p = relativePath(path, resolvePath(sourcePath, name));
    output.replaceLeft(node.arguments[0].start, node.arguments[0].end, `${JSON.stringify(p)}, import.meta.url`);
  }

  // TODO Dynamic imports are resolved differently (to jsDelivr)
  // TODO Consolidate duplicate code with getResolvers?
  for (const node of imports) {
    if (node.source && isStringLiteral(node.source)) {
      const specifier = getStringLiteralValue(node.source);
      const p = isPathImport(specifier)
        ? relativePath(path, resolveImportPath(root, resolvePath(sourcePath, specifier)))
        : builtins.has(specifier)
        ? relativePath(path, builtins.get(specifier)!)
        : specifier.startsWith("observablehq:")
        ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}.js`)
        : specifier.startsWith("npm:")
        ? relativePath(path, await resolveNpmImport(root, specifier.slice("npm:".length)))
        : specifier;
      output.replaceLeft(node.source.start, node.source.end, JSON.stringify(p));
    }
  }

  return String(output);
}

function rewriteImportExpressions(
  output: Sourcemap,
  body: Node,
  resolve: (specifier: string) => string = String
): void {
  simple(body, {
    ImportExpression(node) {
      if (isStringLiteral(node.source)) {
        output.replaceLeft(
          node.source.start,
          node.source.end,
          JSON.stringify(resolve(getStringLiteralValue(node.source)))
        );
      }
    }
  });
}

function rewriteImportDeclarations(
  output: Sourcemap,
  body: Node,
  resolve: (specifier: string) => string = String
): void {
  const declarations: ImportDeclaration[] = [];

  simple(body, {
    ImportDeclaration(node) {
      if (isStringLiteral(node.source)) {
        declarations.push(node);
      }
    }
  });

  const specifiers: string[] = [];
  const imports: string[] = [];
  for (const node of declarations) {
    output.delete(node.start, node.end + +(output.input[node.end] === "\n"));
    specifiers.push(rewriteImportSpecifiers(node));
    imports.push(`import(${JSON.stringify(resolve(getStringLiteralValue(node.source as StringLiteral)))})`);
  }
  if (declarations.length > 1) {
    output.insertLeft(0, `const [${specifiers.join(", ")}] = await Promise.all([${imports.join(", ")}]);\n`);
  } else if (declarations.length === 1) {
    output.insertLeft(0, `const ${specifiers[0]} = await ${imports[0]};\n`);
  }
}

function rewriteImportSpecifiers(node: ImportDeclaration): string {
  return node.specifiers.some(isNotNamespaceSpecifier)
    ? `{${node.specifiers.filter(isNotNamespaceSpecifier).map(rewriteImportSpecifier).join(", ")}}`
    : node.specifiers.find(isNamespaceSpecifier)?.local.name ?? "{}";
}

function rewriteImportSpecifier(node: ImportSpecifier | ImportDefaultSpecifier): string {
  return isDefaultSpecifier(node)
    ? `default: ${getLocalName(node)}`
    : getImportedName(node) === getLocalName(node)
    ? getLocalName(node)
    : `${getImportedName(node)}: ${getLocalName(node)}`;
}

function getLocalName(node: ImportSpecifier | ImportDefaultSpecifier): string {
  return node.local.name;
}

function getImportedName(node: ImportSpecifier): string {
  return node.imported.type === "Identifier" ? node.imported.name : node.imported.raw!;
}

function isDefaultSpecifier(
  node: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
): node is ImportDefaultSpecifier {
  return node.type === "ImportDefaultSpecifier";
}

function isNamespaceSpecifier(
  node: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
): node is ImportNamespaceSpecifier {
  return node.type === "ImportNamespaceSpecifier";
}

function isNotNamespaceSpecifier(
  node: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
): node is ImportSpecifier | ImportDefaultSpecifier {
  return node.type !== "ImportNamespaceSpecifier";
}
