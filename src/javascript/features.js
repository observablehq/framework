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
      if (
        args.length !== 1 ||
        !(
          (arg.type === "Literal" && /^['"]/.test(arg.raw)) ||
          (arg.type === "TemplateLiteral" && arg.expressions.length === 0)
        )
      ) {
        throw syntaxError(`${callee.name} requires a single literal string argument`, node, input);
      }

      features.push({
        type: callee.name,
        name: arg.type === "Literal" ? arg.value : arg.quasis[0].value.cooked,
        expression: node
      });
    }
  });

  return features;
}
