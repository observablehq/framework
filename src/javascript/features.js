import {simple} from "acorn-walk";
import {syntaxError} from "./syntaxError.js";

export function findFeatures(node, references, input) {
  const features = [];

  simple(node, {
    CallExpression(node) {
      const {
        callee,
        arguments: args,
        arguments: [arg]
      } = node;

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

      features.push({type: callee.name, name: getStringLiteralValue(arg)});
    },
    // Promote dynamic imports with static literals to file attachment references.
    ImportExpression: findImport,
    ImportDeclaration: findImport
  });

  function findImport(node) {
    if (isStringLiteral(node.source)) {
      const value = getStringLiteralValue(node.source);
      if (value.startsWith("./")) {
        features.push({type: "FileAttachment", name: value});
      }
    }
  }

  return features;
}

export function isStringLiteral(node) {
  return (
    (node.type === "Literal" && /^['"]/.test(node.raw)) ||
    (node.type === "TemplateLiteral" && node.expressions.length === 0)
  );
}

export function getStringLiteralValue(node) {
  return node.type === "Literal" ? node.value : node.quasis[0].value.cooked;
}
