import type {CallExpression, Identifier, Node} from "acorn";
import {simple} from "acorn-walk";
import {type Feature, type JavaScriptNode} from "../javascript.js";
import {type Sourcemap} from "../sourcemap.js";
import {relativeUrl, resolvePath} from "../url.js";
import {getStringLiteralValue, isStringLiteral} from "./features.js";
import {isLocalImport} from "./imports.js";

export function rewriteFetches(output: Sourcemap, rootNode: JavaScriptNode, sourcePath: string): void {
  simple(rootNode.body, {
    CallExpression(node) {
      rewriteFetch(node, output, rootNode, sourcePath);
    }
  });
}

export function rewriteFetch(node: CallExpression, output: Sourcemap, rootNode: JavaScriptNode, sourcePath: string) {
  if (isLocalFetch(node, rootNode.references || [], sourcePath)) {
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
    if (isLocalFetch(node, [], sourcePath)) {
      const {
        arguments: [arg]
      } = node;
      fetches.push({type: "FileAttachment", name: getStringLiteralValue(arg)});
    }
  }

  return fetches;
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
