import {extname} from "node:path";
import type {CallExpression, Literal, MemberExpression, Node, TemplateLiteral} from "acorn";
import {ancestor, simple} from "acorn-walk";
import {defaultGlobals} from "./globals.js";
import {findReferences} from "./references.js";
import {syntaxError} from "./syntaxError.js";

export type FileExpression = {
  node: CallExpression;
  name: string; // e.g., "foo.csv"
  method?: string; // e.g., "arrow" or "csv"
};

type StringLiteral =
  | {type: "Literal"; value: string} // FileAttachment("foo.csv")
  | {type: "TemplateLiteral"; quasis: {value: {cooked: string}}[]}; // FileAttachment(`foo.csv`)

const KNOWN_FILE_EXTENSIONS = {
  ".arrow": "arrow",
  ".csv": "csv",
  ".db": "sqlite",
  ".html": "html",
  ".json": "json",
  ".parquet": "parquet",
  ".sqlite": "sqlite",
  ".tsv": "tsv",
  ".txt": "text",
  ".xlsx": "xlsx",
  ".xml": "xml",
  ".zip": "zip"
};

/**
 */
export function findFiles(body: Node, input: string): FileExpression[] {
  const declarations = new Set<{name: string}>();
  const alias = new Set<string>();
  let globals: Set<string> | undefined;

  // Find the declared local names of FileAttachment. Currently only named
  // imports are supported, and stdlib must be imported without a version. TODO
  // Support namespace imports? Error if stdlib is expressed with a version?
  simple(body, {
    ImportDeclaration(node) {
      if (node.source.value === "npm:@observablehq/stdlib") {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "FileAttachment"
          ) {
            declarations.add(specifier.local);
            alias.add(specifier.local.name);
          }
        }
      }
    }
  });

  // If the import is masking a global, don’t treat it as a global (since we’ll
  // ignore the import declaration below).
  for (const name of alias.keys()) {
    if (defaultGlobals.has(name)) {
      (globals ??= new Set(defaultGlobals)).delete(name);
    }
  }

  // Collect all references to FileAttachment.
  const references = new Set(
    findReferences(body, {
      globals,
      filterDeclaration: (identifier) =>
        !declarations.has(identifier) && // treat the imported declaration as unbound
        alias.has(identifier.name)
    })
  );

  const files: FileExpression[] = [];

  // Find all calls to FileAttachment. Then look to see if the call is part of a
  // member expression, such as FileAttachment("foo.txt").csv, and use this to
  // determine the file method ("csv"); otherwise fallback to the to file
  // extension to determine the method. Also enforce that FileAttachment is
  // passed a static string literal.
  ancestor(body, {
    CallExpression(node, state, stack) {
      const {callee} = node;
      if (callee.type !== "Identifier" || !references.has(callee)) return;

      const {
        arguments: args,
        arguments: [arg]
      } = node;

      // Forbid dynamic calls.
      if (args.length !== 1 || !isStringLiteral(arg)) {
        throw syntaxError("FileAttachment requires a single literal string argument", node, input);
      }

      const name = getStringLiteralValue(arg);
      const parent = stack[stack.length - 2];
      let method: string | undefined;
      if (isMemberExpression(parent) && parent.property.type === "Identifier") {
        method = parent.property.name;
      } else {
        method = KNOWN_FILE_EXTENSIONS[extname(name)];
      }

      files.push({node, name, method});
    }
  });

  return files;
}

function isMemberExpression(node: Node): node is MemberExpression {
  return node.type === "MemberExpression";
}

function isLiteral(node: Node): node is Literal {
  return node.type === "Literal";
}

function isTemplateLiteral(node: Node): node is TemplateLiteral {
  return node.type === "TemplateLiteral";
}

function isStringLiteral(node: Node): node is StringLiteral & Node {
  return isLiteral(node) ? /^['"]/.test(node.raw!) : isTemplateLiteral(node) ? node.expressions.length === 0 : false;
}

function getStringLiteralValue(node: StringLiteral): string {
  return node.type === "Literal" ? node.value : node.quasis[0].value.cooked;
}
