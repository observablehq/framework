import {extname} from "node:path";
import type {CallExpression, Node} from "acorn";
import {ancestor, simple} from "acorn-walk";
import {getLocalPath} from "../files.js";
import {defaultGlobals} from "./globals.js";
import {getStringLiteralValue, isMemberExpression, isStringLiteral} from "./node.js";
import {findReferences} from "./references.js";
import {syntaxError} from "./syntaxError.js";

export type FileExpression = {
  node: CallExpression;
  name: string; // e.g., "foo.csv"
  path: string; // TODO the path to the file relative to the source root
  method?: string; // e.g., "arrow" or "csv"
};

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
 * Returns all calls to FileAttachment in the specified body. Throws a
 * SyntaxError if any of the calls are invalid (e.g., when FileAttachment is
 * passed a dynamic argument, or references a file that is outside the root).
 */
export function findFileAttachments(
  body: Node,
  path: string,
  input: string,
  aliases?: Iterable<string> // ["FileAttachment"] for implicit import
): FileExpression[] {
  const declarations = new Set<{name: string}>();
  const alias = new Set<string>(aliases);
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
      filterDeclaration: (identifier) => !declarations.has(identifier) // treat the imported declaration as unbound
    })
  );

  const files: FileExpression[] = [];

  // Find all calls to FileAttachment. If the call is part of a member
  // expression such as FileAttachment("foo.txt").csv, use this to determine the
  // file method ("csv"); otherwise fallback to the to file extension to
  // determine the method. Also enforce that FileAttachment is passed a single
  // static string literal.
  ancestor(body, {
    CallExpression(node, state, stack) {
      const {callee} = node;
      if (callee.type !== "Identifier" || !alias.has(callee.name) || !references.has(callee)) return;
      const args = node.arguments;
      if (args.length !== 1) throw syntaxError("FileAttachment requires a single literal string argument", node, input);
      const [arg] = args;
      if (!isStringLiteral(arg)) throw syntaxError("FileAttachment requires a single literal string argument", node, input); // prettier-ignore
      const fileName = getStringLiteralValue(arg);
      const filePath = getLocalPath(path, fileName);
      if (!filePath) throw syntaxError(`non-local file path: ${fileName}`, node, input);
      const parent = stack[stack.length - 2];
      const fileMethod =
        parent && isMemberExpression(parent) && parent.property.type === "Identifier"
          ? parent.property.name // FileAttachment("foo.csv").csv
          : KNOWN_FILE_EXTENSIONS[extname(fileName)]; // bare FileAttachment("foo.csv")
      files.push({node, name: fileName, path: filePath, method: fileMethod});
    }
  });

  return files;
}
