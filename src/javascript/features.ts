import type {CallExpression, Identifier, Literal, Node, TemplateLiteral} from "acorn";
import {simple} from "acorn-walk";
import {getLocalPath} from "../files.js";
import type {Feature} from "../javascript.js";
import {syntaxError} from "./syntaxError.js";

export function findFeatures(node: Node, path: string, references: Identifier[], input: string): Feature[] {
  const features: Feature[] = [];

  simple(node, {
    CallExpression(node) {
      const {callee} = node;
      // Ignore function calls that are not references to the feature. For
      // example, if there’s a local variable called Secret, that will mask the
      // built-in Secret and won’t be considered a feature.
      if (callee.type !== "Identifier" || !references.includes(callee)) return;
      const {name: type} = callee;
      if (type !== "Secret" && type !== "FileAttachment" && type !== "DatabaseClient") return;
      features.push(getFeature(type, node, path, input));
    }
  });

  return features;
}

export function getFeature(type: Feature["type"], node: CallExpression, path: string, input: string): Feature {
  const {
    arguments: args,
    arguments: [arg]
  } = node;

  // Forbid dynamic calls.
  if (args.length !== 1 || !isStringLiteral(arg)) {
    throw syntaxError(`${type} requires a single literal string argument`, node, input);
  }

  // Forbid file attachments that are not local paths; normalize the path.
  let name: string | null = getStringLiteralValue(arg);
  if (type === "FileAttachment") {
    const localPath = getLocalPath(path, name);
    if (!localPath) throw syntaxError(`non-local file path: ${name}`, node, input);
    name = localPath;
  }

  return {type, name};
}

export function isStringLiteral(node: any): node is Literal | TemplateLiteral {
  return (
    node &&
    ((node.type === "Literal" && /^['"]/.test(node.raw)) ||
      (node.type === "TemplateLiteral" && node.expressions.length === 0))
  );
}

// Note: only valid if isStringLiteral returned true;
export function getStringLiteralValue(node: any): string {
  return node.type === "Literal" ? (node.value as string) : node.quasis[0].value.cooked!;
}
