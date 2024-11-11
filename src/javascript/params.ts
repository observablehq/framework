import type {Identifier, Literal, MemberExpression, Node} from "acorn";
import {simple} from "acorn-walk";
import type {Params} from "../route.js";
import {findReferences} from "./references.js";
import {syntaxError} from "./syntaxError.js";

export type ParamReference = MemberExpression & {property: Identifier | (Literal & {value: string}); value: string};

function getParamName(param: ParamReference): string {
  return param.property.type === "Identifier" ? param.property.name : param.property.value;
}

// Note: mutates node by materializing the values of the param references it contains
export function checkParams(node: Node, input: string, params: Params): void {
  for (const [name, param] of findParams(node, params, input)) {
    param.value = params[name];
  }
}

export function findParams(body: Node, params: Params, input: string): [name: string, node: ParamReference][] {
  const matches: [string, ParamReference][] = [];
  const references = findReferences(body, {filterReference: ({name}) => name === "observable"});

  simple(body, {
    MemberExpression(node) {
      if (isParamReference(node)) {
        const name = getParamName(node);
        if (!(name in params)) throw syntaxError(`undefined parameter: ${name}`, node, input);
        matches.push([name, node]);
      }
    }
  });

  function isParamReference(node: MemberExpression): node is ParamReference {
    if (
      node.object.type !== "MemberExpression" ||
      node.object.object.type !== "Identifier" ||
      node.object.object.name !== "observable" ||
      node.object.property.type !== "Identifier" ||
      node.object.property.name !== "params" ||
      !references.includes(node.object.object)
    ) {
      return false;
    }
    if (node.property.type !== "Identifier" && node.property.type !== "Literal") {
      throw syntaxError("invalid param reference", node, input);
    }
    return true;
  }

  return matches;
}
