import type {Identifier, Literal, MemberExpression, Node} from "acorn";
import {simple} from "acorn-walk";
import {syntaxError} from "./syntaxError.js";

export type Params = {[name: string]: string};

export type ParamReference = MemberExpression & {property: Identifier | (Literal & {value: string}); value: string};

function getParamName(param: ParamReference): string {
  return param.property.type === "Identifier" ? param.property.name : param.property.value;
}

export function checkParams(node: Node, input: string, params: Params): void {
  for (const [name, param] of findParams(node, params, input)) {
    param.value = params[name];
  }
}

export function findParams(body: Node, params: Params, input: string): [name: string, node: ParamReference][] {
  const matches: [string, ParamReference][] = [];

  // TODO Replace only if observable is not shadowed by a local reference.
  // const references = findReferences(body, {globals: new Set()});

  simple(body, {
    MemberExpression(node) {
      if (isParamReference(node)) {
        const name = getParamName(node);
        if (!(name in params)) throw syntaxError(`undefined parameter: ${name}`, node, input);
        matches.push([name, node]);
      }
    }
  });

  // Warning: this function tells you whether the member expression looks like a
  // param reference (observable.params.foo), but it doesn’t check whether
  // observable is masked by a local variable instead; you should check whether a
  // param has been resolved by looking at node.value instead, which is assigned
  // in checkParams.
  function isParamReference(node: MemberExpression): node is ParamReference {
    if (
      node.object.type !== "MemberExpression" ||
      node.object.object.type !== "Identifier" ||
      node.object.object.name !== "observable" ||
      node.object.property.type !== "Identifier" ||
      node.object.property.name !== "params"
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
