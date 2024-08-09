import type {Identifier, MemberExpression, Node} from "acorn";
import {simple} from "acorn-walk";
import {syntaxError} from "./syntaxError.js";

export type Params = {[name: string]: string};

export type ParamReference = MemberExpression & {property: Identifier; value: string};

export class UndefinedParamError extends Error {
  public readonly node: ParamReference;

  constructor(node: ParamReference) {
    super(`undefined parameter: ${node.property.name}`);
    this.node = node;
    Error.captureStackTrace(this, UndefinedParamError);
  }
}

export function checkParams(node: Node, input: string, params: Params): void {
  try {
    for (const param of findParams(node, params)) {
      param.value = params[param.property.name];
    }
  } catch (error) {
    throw error instanceof UndefinedParamError ? syntaxError(error.message, error.node, input) : error;
  }
}

// TODO Replace only if observable is not shadowed by a local reference.
// TODO Handle computed properties, or throw an error?
export function findParams(body: Node, params: Params): ParamReference[] {
  const nodes: ParamReference[] = [];

  // const references = findReferences(body, {globals: new Set()});
  simple(body, {
    MemberExpression(node) {
      if (isParamReference(node)) {
        if (!(node.property.name in params)) throw new UndefinedParamError(node);
        nodes.push(node);
      }
    }
  });

  return nodes;
}

// Warning: this function tells you whether the member expression looks like a
// param reference (observable.params.foo), but it doesn’t check whether
// observable is masked by a local variable instead; you should check whether a
// param has been resolved by looking at node.value instead, which is assigned
// in checkParams.
function isParamReference(node: MemberExpression): node is ParamReference {
  return (
    node.object.type === "MemberExpression" &&
    node.object.object.type === "Identifier" &&
    node.object.object.name === "observable" &&
    node.object.property.type === "Identifier" &&
    node.object.property.name === "params" &&
    node.property.type === "Identifier"
  );
}
