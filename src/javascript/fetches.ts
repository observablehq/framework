import type {CallExpression, Identifier, Node, Program} from "acorn";
import {simple} from "acorn-walk";
import {type Feature, type JavaScriptNode} from "../javascript.js";
import {type Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";
import {isLocalImport} from "./imports.js";

export function rewriteFetches(output: Sourcemap, rootNode: JavaScriptNode, sourcePath: string): void {
  simple(rootNode.body, {
    CallExpression(node) {
      rewriteIfLocalFetch(node, output, rootNode, sourcePath);
    }
  });
}

export function rewriteIfLocalFetch(
  node: CallExpression,
  output: Sourcemap,
  rootNode: JavaScriptNode | Program,
  sourcePath: string
) {
  if (isLocalFetch(node, "references" in rootNode ? rootNode.references : [], sourcePath)) {
    const arg = node.arguments[0];
    const value = getStringLiteralValue(arg);
    const path = resolvePath("_file", sourcePath, value);
    output.replaceLeft(arg.start, arg.end, JSON.stringify(relativeUrl(sourcePath, path)));
  }
}

export function findFetches(body: Node, path: string) {
  const fetches: Feature[] = [];

  simple(body, {CallExpression: findFetch}, undefined, path);

  // Promote fetches with static literals to file attachment references.

  function findFetch(node: CallExpression, sourcePath: string) {
    fetches.push(...maybeExtractFetch(node, sourcePath));
  }

  return fetches;
}

export function maybeExtractFetch(node: CallExpression, sourcePath: string): Feature[] {
  return isLocalFetch(node, [], sourcePath)
    ? [{type: "FileAttachment", name: getStringLiteralValue(node.arguments[0])}]
    : [];
}

export function isLocalFetch(node: CallExpression, references: Identifier[], sourcePath: string): boolean {
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
