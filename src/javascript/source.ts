import type {Literal, Node, TemplateLiteral} from "acorn";

export type StringLiteral = (
  | {type: "Literal"; value: string}
  | {type: "TemplateLiteral"; quasis: {value: {cooked: string}}[]}
) &
  Node;

export function isLiteral(node: Node): node is Literal {
  return node.type === "Literal";
}

export function isTemplateLiteral(node: Node): node is TemplateLiteral {
  return node.type === "TemplateLiteral";
}

export function isStringLiteral(node: Node): node is StringLiteral {
  return isLiteral(node) ? /^['"]/.test(node.raw!) : isTemplateLiteral(node) ? node.expressions.length === 0 : false;
}

export function getStringLiteralValue(node: StringLiteral): string {
  return node.type === "Literal" ? node.value : node.quasis[0].value.cooked;
}
