import type {Options} from "acorn";
import {Parser, tokTypes} from "acorn";
import {findAssignments} from "./javascript/assignments.js";
import {findAwaits} from "./javascript/awaits.js";
import {findDeclarations} from "./javascript/declarations.js";
import {defaultGlobals} from "./javascript/globals.js";
import {findReferences} from "./javascript/references.js";
import {Sourcemap} from "./sourcemap.js";

export function transpileJavaScript(input: string, id: number): string {
  try {
    const node = parseJavaScript(input);
    const inputs = Array.from(new Set(node.references.map((r) => r.name)));
    if (node.expression && !inputs.includes("display")) (input = `display((\n${input}\n))`), inputs.push("display");
    const body = new Sourcemap(input);
    if (node.assignments) {
      for (const assignment of node.assignments) {
        switch (assignment.type) {
          case "VariableDeclarator":
            body.insertLeft(assignment.init.start, `(exports.${assignment.id.name} = `);
            body.insertRight(assignment.init.end, `)`);
            break;
          case "AssignmentExpression":
            body.insertLeft(assignment.right.start, `(exports.${assignment.left.name} = `);
            body.insertRight(assignment.right.end, `)`);
            break;
          default:
            throw new Error(`unknown assignment type: ${assignment.type}`);
        }
      }
    }
    // TODO
    // - handle name collision with exports
    // - don’t clear display greedily on pending; wait until the first new display happens?
    return `
main.variable(((root) => ({pending: () => (root.innerHTML = "")}))(document.querySelector("#cell-${id}")), {shadow: {display: () => (((root) => (value) => (new Inspector(root.appendChild(document.createElement("DIV"))).fulfilled(value), value))(document.querySelector("#cell-${id}")))}}).define("cell ${id}", ${JSON.stringify(
      inputs
    )}, ${node.async ? "async " : ""}(${inputs}) => {${node.declarations?.length ? "\nconst exports = {};" : ""}
${String(body).trim()}${node.declarations?.length ? "\nreturn exports;" : ""}
});${
      node.declarations
        ? node.declarations
            .map(
              ({name}) => `
main.define(${JSON.stringify(name)}, ["cell ${id}"], (exports) => exports.${name});`
            )
            .join("")
        : ""
    }
`;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return `
// define(${JSON.stringify(id)}, [], () => { throw new SyntaxError(${JSON.stringify(error.message)}); });
`;
  }
}

// function display(variable, root) {
//   let version = 0;
//   return (value) => {
//     if (variable._version > version) {
//       version = variable._version;
//       root.innerHTML = "";
//     }
//     (new Inspector(root)).fulfilled(value);
//   };
// }

// function define(id, inputs, body) {
//   const root = document.querySelector(\`#$\{id}\`);
//   const variable = main
//     .variable({rejected: (error) => (new Inspector(root)).rejected(error)}, {shadow: {display: () => display(variable, root)}})
//     .define(inputs, body);
// }

export function parseJavaScript(
  input: string,
  {globals = defaultGlobals, ...otherOptions}: Partial<Options> & {globals?: Set<string>} = {}
) {
  const options: Options = {...otherOptions, ecmaVersion: 13, sourceType: "module"};
  // First attempt to parse as an expression; if this fails, parse as a program.
  const expression = maybeParseExpression(input, options);
  const body = expression ?? (Parser.parse(input, options) as any);
  const references = findReferences(body, globals, input);
  const declarations = expression ? null : findDeclarations(body, globals, input);
  const assignments = expression ? null : findAssignments(body);
  return {
    body,
    declarations,
    assignments,
    references,
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

// Parses a single expression; like parseExpressionAt, but returns null if
// additional input follows the expression.
function maybeParseExpression(input, options) {
  const parser = new Parser(options, input, 0);
  parser.nextToken();
  try {
    const node = (parser as any).parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
