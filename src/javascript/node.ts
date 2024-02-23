import type {Literal, MemberExpression, Node, TemplateLiteral} from "acorn";

type StringLiteral =
  | {type: "Literal"; value: string} // FileAttachment("foo.csv")
  | {type: "TemplateLiteral"; quasis: {value: {cooked: string}}[]}; // FileAttachment(`foo.csv`)

export function isMemberExpression(node: Node): node is MemberExpression {
  return node.type === "MemberExpression";
}

export function isLiteral(node: Node): node is Literal {
  return node.type === "Literal";
}

export function isTemplateLiteral(node: Node): node is TemplateLiteral {
  return node.type === "TemplateLiteral";
}

export function isStringLiteral(node: Node): node is StringLiteral & Node {
  return isLiteral(node) ? /^['"]/.test(node.raw!) : isTemplateLiteral(node) ? node.expressions.length === 0 : false;
}

export function getStringLiteralValue(node: StringLiteral): string {
  return node.type === "Literal" ? node.value : node.quasis[0].value.cooked;
}
