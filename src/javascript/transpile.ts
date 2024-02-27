import type {ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, Node} from "acorn";
import {simple} from "acorn-walk";
// import mime from "mime";
import {Sourcemap} from "../sourcemap.js";
// import type {FileExpression} from "./files.js";
import {hasImportDeclaration} from "./imports.js";
import type {StringLiteral} from "./node.js";
import {getStringLiteralValue, isStringLiteral} from "./node.js";
import type {JavaScriptNode} from "./parse.js";

export interface TranspileOptions {
  id: string;
  inline?: boolean;
  // resolveFile?: (name: string) => string;
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
  output.insertLeft(0, `define({id: ${JSON.stringify(id)}`);
  if (outputs.length) output.insertRight(node.input.length, `\nreturn {${outputs}};`);
  output.insertRight(node.input.length, "\n}});\n");
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
