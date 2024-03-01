import {join} from "node:path/posix";
import type {CallExpression, Node} from "acorn";
import type {ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier} from "acorn";
import {Parser} from "acorn";
import {simple} from "acorn-walk";
import {isPathImport, relativePath, resolvePath} from "../path.js";
import {getModuleResolver} from "../resolvers.js";
import {Sourcemap} from "../sourcemap.js";
import {findFiles} from "./files.js";
import type {ExportNode, ImportNode} from "./imports.js";
import {hasImportDeclaration, isImportMetaResolve} from "./imports.js";
import type {JavaScriptNode} from "./parse.js";
import {parseOptions} from "./parse.js";
import type {StringLiteral} from "./source.js";
import {getStringLiteralValue, isStringLiteral} from "./source.js";

export interface TranspileOptions {
  id: string;
  resolveImport?: (specifier: string) => string;
}

export function transpileJavaScript(node: JavaScriptNode, {id, resolveImport}: TranspileOptions): string {
  let async = node.async;
  const inputs = Array.from(new Set<string>(node.references.map((r) => r.name)));
  const outputs = Array.from(new Set<string>(node.declarations?.map((r) => r.name)));
  const display = node.expression && !inputs.includes("display") && !inputs.includes("view");
  if (display) inputs.push("display"), (async = true);
  if (hasImportDeclaration(node.body)) async = true;
  const output = new Sourcemap(node.input).trim();
  rewriteImportDeclarations(output, node.body, resolveImport);
  rewriteImportExpressions(output, node.body, resolveImport);
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

export interface TranspileModuleOptions {
  root: string;
  path: string;
  resolveImport?: (specifier: string) => Promise<string>;
}

/** Rewrites import specifiers and FileAttachment calls in the specified ES module. */
export async function transpileModule(
  input: string,
  {root, path, resolveImport = getModuleResolver(root, path)}: TranspileModuleOptions
): Promise<string> {
  const servePath = `/${join("_import", path)}`;
  const body = Parser.parse(input, parseOptions); // TODO ignore syntax error?
  const output = new Sourcemap(input);
  const imports: (ImportNode | ExportNode)[] = [];
  const calls: CallExpression[] = [];

  simple(body, {
    ImportDeclaration: rewriteImport,
    ImportExpression: rewriteImport,
    ExportAllDeclaration: rewriteImport,
    ExportNamedDeclaration: rewriteImport,
    CallExpression: rewriteCall
  });

  function rewriteImport(node: ImportNode | ExportNode) {
    imports.push(node);
  }

  function rewriteCall(node: CallExpression) {
    calls.push(node);
  }

  async function rewriteImportSource(source: StringLiteral) {
    const specifier = getStringLiteralValue(source);
    output.replaceLeft(source.start, source.end, JSON.stringify(await resolveImport(specifier)));
  }

  for (const {name, node} of findFiles(body, path, input)) {
    const source = node.arguments[0];
    const p = relativePath(servePath, resolvePath(path, name));
    output.replaceLeft(source.start, source.end, `${JSON.stringify(p)}, import.meta.url`);
  }

  for (const node of imports) {
    const source = node.source;
    if (source && isStringLiteral(source)) {
      await rewriteImportSource(source);
    }
  }

  for (const node of calls) {
    const source = node.arguments[0];
    if (isImportMetaResolve(node) && isStringLiteral(source)) {
      await rewriteImportSource(source);
    }
  }

  return String(output);
}

function rewriteImportExpressions(
  output: Sourcemap,
  body: Node,
  resolve: (specifier: string) => string = String
): void {
  function rewriteImportSource(source: StringLiteral) {
    output.replaceLeft(source.start, source.end, JSON.stringify(resolve(getStringLiteralValue(source))));
  }
  simple(body, {
    ImportExpression(node) {
      const source = node.source;
      if (isStringLiteral(source)) {
        rewriteImportSource(source);
      }
    },
    CallExpression(node) {
      const source = node.arguments[0];
      if (isImportMetaResolve(node) && isStringLiteral(source)) {
        const resolution = resolve(getStringLiteralValue(source));
        output.replaceLeft(
          node.start,
          node.end,
          isPathImport(resolution)
            ? `new URL(${JSON.stringify(resolution)}, location).href`
            : JSON.stringify(resolution)
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
