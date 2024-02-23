import assert from "node:assert";
import type {Expression} from "acorn";
import {Parser} from "acorn";
import {getStringLiteralValue} from "../src/javascript/node.js";
import {isLiteral, isMemberExpression, isStringLiteral, isTemplateLiteral} from "../src/javascript/node.js";

describe("isMemberExpression", () => {
  it("returns true for member expressions", () => {
    assert.strictEqual(isMemberExpression(parseExpression("foo.bar")), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isMemberExpression(parseExpression("foo()")), false);
  });
});

describe("isLiteral", () => {
  it("returns true for literals", () => {
    assert.strictEqual(isLiteral(parseExpression("42")), true);
    assert.strictEqual(isLiteral(parseExpression("'foo'")), true);
    assert.strictEqual(isLiteral(parseExpression('"foo"')), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isLiteral(parseExpression("foo")), false);
    assert.strictEqual(isLiteral(parseExpression("foo()")), false);
  });
});

describe("isTemplateLiteral", () => {
  it("returns true for template literals", () => {
    assert.strictEqual(isTemplateLiteral(parseExpression("`foo`")), true);
    assert.strictEqual(isTemplateLiteral(parseExpression("`${42}`")), true);
  });
  it("returns false for other nodes", () => {
    assert.strictEqual(isTemplateLiteral(parseExpression("'42'")), false);
    assert.strictEqual(isTemplateLiteral(parseExpression("foo")), false);
  });
});

describe("isStringLiteral", () => {
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

describe("getStringLiteralValue", () => {
  it("returns the static string literal value", () => {
    const a = parseExpression('"foo"');
    const b = parseExpression("'foo'");
    const c = parseExpression("`foo`");
    assert.strictEqual(isStringLiteral(a) && getStringLiteralValue(a), "foo");
    assert.strictEqual(isStringLiteral(b) && getStringLiteralValue(b), "foo");
    assert.strictEqual(isStringLiteral(c) && getStringLiteralValue(c), "foo");
  });
});

function parseExpression(input: string): Expression {
  return Parser.parseExpressionAt(input, 0, {ecmaVersion: 13, sourceType: "module"});
}
