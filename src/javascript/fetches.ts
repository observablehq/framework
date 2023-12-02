import {join} from "node:path";
import type {CallExpression, Identifier, Node} from "acorn";
import {simple} from "acorn-walk";
import {type Feature, type JavaScriptNode} from "../javascript.js";
import {type Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";
import {defaultGlobals} from "./globals.js";
import {isLocalImport} from "./imports.js";
import {findReferences} from "./references.js";

export function rewriteFetches(output: Sourcemap, rootNode: JavaScriptNode, sourcePath: string): void {
  simple(rootNode.body, {
    CallExpression(node) {
      rewriteIfLocalFetch(node, output, rootNode.references, sourcePath);
    }
  });
}

export function rewriteIfLocalFetch(
  node: CallExpression,
  output: Sourcemap,
  references: Identifier[],
  sourcePath: string,
  meta = false
) {
  if (isLocalFetch(node, references, sourcePath)) {
    const arg = node.arguments[0];
    const value = getStringLiteralValue(arg);
    const path = resolvePath("_file", sourcePath, value);
    let result = JSON.stringify(relativeUrl(meta ? join("_import", sourcePath) : sourcePath, path));
    if (meta) result = `new URL(${result}, import.meta.url)`; // more support than import.meta.resolve
    output.replaceLeft(arg.start, arg.end, result);
  }
}

// Promote fetches with static literals to file attachment references.
export function findFetches(body: Node, path: string) {
  const references: Identifier[] = findReferences(body, defaultGlobals);
  const fetches: Feature[] = [];

  simple(body, {CallExpression: findFetch}, undefined, path);

  function findFetch(node: CallExpression, sourcePath: string) {
    maybeAddFetch(fetches, node, references, sourcePath);
  }

  return fetches;
}

export function maybeAddFetch(
  features: Feature[],
  node: CallExpression,
  references: Identifier[],
  sourcePath: string
): void {
  if (isLocalFetch(node, references, sourcePath)) {
    features.push({type: "FileAttachment", name: getStringLiteralValue(node.arguments[0])});
  }
}

function isLocalFetch(node: CallExpression, references: Identifier[], sourcePath: string): boolean {
  const {
    callee,
    arguments: [arg]
  } = node;
  return (
    callee.type === "Identifier" &&
    callee.name === "fetch" &&
    !references.includes(callee) &&
    isStringLiteral(arg) &&
    isLocalImport(getStringLiteralValue(arg), sourcePath)
  );
}
