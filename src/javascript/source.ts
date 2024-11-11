import type {BinaryExpression, Literal, MemberExpression, Node, TemplateLiteral} from "acorn";

export type StringLiteral = (Literal & {value: string}) | TemplateLiteral | BinaryExpression;

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
    : isBinaryExpression(node)
    ? node.operator === "+" && isStringLiteral(node.left) && isStringLiteral(node.right)
    : isMemberExpression(node)
    ? "value" in node // param
    : false;
}

export function getStringLiteralValue(node: StringLiteral): string {
  return node.type === "TemplateLiteral"
    ? getTemplateLiteralValue(node)
    : node.type === "BinaryExpression"
    ? getBinaryExpressionValue(node)
    : node.value; // Literal or ParamReference
}

function getTemplateLiteralValue(node: TemplateLiteral): string {
  let value = node.quasis[0].value.cooked!;
  for (let i = 0; i < node.expressions.length; ++i) {
    value += getStringLiteralValue(node.expressions[i] as StringLiteral);
    value += node.quasis[i + 1].value.cooked!;
  }
  return value;
}

function getBinaryExpressionValue(node: BinaryExpression): string {
  return getStringLiteralValue(node.left as StringLiteral) + getStringLiteralValue(node.right as StringLiteral);
}

function isMemberExpression(node: Node): node is MemberExpression {
  return node.type === "MemberExpression";
}

function isBinaryExpression(node: Node): node is BinaryExpression {
  return node.type === "BinaryExpression";
}
