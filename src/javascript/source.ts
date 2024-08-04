import type {Literal, MemberExpression, Node, TemplateLiteral} from "acorn";

export type StringLiteral = (Literal & {value: string}) | TemplateLiteral;

export function isLiteral(node: Node): node is Literal {
  return node.type === "Literal";
}

export function isTemplateLiteral(node: Node): node is TemplateLiteral {
  return node.type === "TemplateLiteral";
}

export function isStringLiteral(node: Node): node is StringLiteral {
  return isLiteral(node)
    ? /^['"]/.test(node.raw!)
    : isTemplateLiteral(node)
    ? node.expressions.every(isStringLiteral)
    : isMemberExpression(node) && "value" in node; // param
}

export function getStringLiteralValue(node: StringLiteral): string {
  if ("value" in node) return node.value; // literal or param
  let value = node.quasis[0].value.cooked!;
  for (let i = 0; i < node.expressions.length; ++i) {
    value += getStringLiteralValue(node.expressions[i] as StringLiteral);
    value += node.quasis[i + 1].value.cooked!;
  }
  return value;
}

export function isMemberExpression(node: Node): node is MemberExpression {
  return node.type === "MemberExpression";
}
