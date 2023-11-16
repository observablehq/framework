import {simple} from "acorn-walk";
import {getLocalPath} from "../files.js";
import {type Feature} from "../javascript.js";
import {isLocalImport} from "./imports.js";
import {syntaxError} from "./syntaxError.js";

export function findFeatures(node, root, sourcePath, references, input) {
  const features: Feature[] = [];

  simple(node, {
    CallExpression(node) {
      const {
        callee,
        arguments: args,
        arguments: [arg]
      } = node;

      // Promote fetches with static literals to file attachment references.
      if (isLocalFetch(node, references, sourcePath)) {
        features.push({type: "FileAttachment", name: getStringLiteralValue(arg)});
        return;
      }

      // Ignore function calls that are not references to the feature. For
      // example, if there’s a local variable called Secret, that will mask the
      // built-in Secret and won’t be considered a feature.
      if (
        callee.type !== "Identifier" ||
        (callee.name !== "Secret" && callee.name !== "FileAttachment" && callee.name !== "DatabaseClient") ||
        !references.includes(callee)
      ) {
        return;
      }

      // Forbid dynamic calls.
      if (args.length !== 1 || !isStringLiteral(arg)) {
        throw syntaxError(`${callee.name} requires a single literal string argument`, node, input);
      }

      // Forbid file attachments that are not local paths.
      const value = getStringLiteralValue(arg);
      if (callee.name === "FileAttachment" && !getLocalPath(sourcePath, value)) {
        throw syntaxError(`non-local file path: "${value}"`, node, input);
      }

      features.push({type: callee.name, name: value});
    }
  });

  return features;
}

export function isLocalFetch(node, references, sourcePath) {
  if (node.type !== "CallExpression") return false;
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

export function isStringLiteral(node) {
  return (
    node &&
    ((node.type === "Literal" && /^['"]/.test(node.raw)) ||
      (node.type === "TemplateLiteral" && node.expressions.length === 0))
  );
}

export function getStringLiteralValue(node) {
  return node.type === "Literal" ? node.value : node.quasis[0].value.cooked;
}
