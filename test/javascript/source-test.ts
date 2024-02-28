import assert from "node:assert";
import type {Expression, Node} from "acorn";
import {Parser} from "acorn";
import {getStringLiteralValue} from "../../src/javascript/source.js";
import {isLiteral, isStringLiteral, isTemplateLiteral} from "../../src/javascript/source.js";

describe("isLiteral(node)", () => {
  it("returns true for literals", () => {
    assert.strictEqual(isLiteral(parseExpression("42")), true);
    assert.strictEqual(isLiteral(parseExpression("true")), true);
    assert.strictEqual(isLiteral(parseExpression("false")), true);
    assert.strictEqual(isLiteral(parseExpression("null")), true);
    assert.strictEqual(isLiteral(parseExpression("'foo'")), true);
    assert.strictEqual(isLiteral(parseExpression('"foo"')), true);
    assert.strictEqual(isLiteral(parseExpression("0n")), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isLiteral(parseExpression("undefined")), false); // Identifier
    assert.strictEqual(isLiteral(parseExpression("1 + 2")), false);
    assert.strictEqual(isLiteral(parseExpression("foo")), false);
    assert.strictEqual(isLiteral(parseExpression("foo()")), false);
  });
});

describe("isTemplateLiteral(node)", () => {
  it("returns true for template literals", () => {
    assert.strictEqual(isTemplateLiteral(parseExpression("`foo`")), true);
    assert.strictEqual(isTemplateLiteral(parseExpression("`${42}`")), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isTemplateLiteral(parseExpression("'42'")), false);
    assert.strictEqual(isTemplateLiteral(parseExpression("foo")), false);
  });
});

describe("isStringLiteral(node)", () => {
  it("returns true for static string literals", () => {
    assert.strictEqual(isStringLiteral(parseExpression('"foo"')), true);
    assert.strictEqual(isStringLiteral(parseExpression("'foo'")), true);
    assert.strictEqual(isStringLiteral(parseExpression("`foo`")), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isStringLiteral(parseExpression("42")), false);
    assert.strictEqual(isStringLiteral(parseExpression("'1' + '2'")), false);
    assert.strictEqual(isStringLiteral(parseExpression("`${42}`")), false);
  });
});

describe("getStringLiteralValue(node)", () => {
  it("returns the static string literal value", () => {
    assert.strictEqual(maybeStringLiteralValue(parseExpression('"foo"')), "foo");
    assert.strictEqual(maybeStringLiteralValue(parseExpression("'foo'")), "foo");
    assert.strictEqual(maybeStringLiteralValue(parseExpression("`foo`")), "foo");
  });
});

function maybeStringLiteralValue(node: Node): string | undefined {
  return isStringLiteral(node) ? getStringLiteralValue(node) : undefined;
}

function parseExpression(input: string): Expression {
  return Parser.parseExpressionAt(input, 0, {ecmaVersion: 13, sourceType: "module"});
}
