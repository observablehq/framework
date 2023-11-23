import assert from "node:assert";
import {transpileTag} from "../src/tag.js";

describe("transpileTag(input)", () => {
  it("bare template literal", () => {
    assert.strictEqual(transpileTag("1 + 2"), "`1 + 2`");
  });
  it("empty", () => {
    assert.strictEqual(transpileTag(""), "``");
  });
  it("embedded expression", () => {
    assert.strictEqual(transpileTag("1 + ${2}"), "`1 + ${2}`");
  });
  it("escaped embedded expression", () => {
    assert.strictEqual(transpileTag("1 + $\\{2}"), "`1 + $\\{2}`");
  });
});

describe("transpileTag(input, tag)", () => {
  it("tagged template literal", () => {
    assert.strictEqual(transpileTag("1 + 2", "tag"), "tag`1 + 2`");
  });
});

describe("transpileTag(input, tag, raw)", () => {
  it("non-raw template literal escapes backslashes", () => {
    assert.strictEqual(transpileTag("\\sqrt{2}", "tex", false), "tex`\\\\sqrt{2}`");
    assert.strictEqual(transpileTag("\\${2}", "tex", false), "tex`\\${2}`");
  });
  it("non-raw template literal escapes backticks", () => {
    assert.strictEqual(transpileTag("`test`", "", false), "`\\`test\\``");
  });
  it("raw template literal does not escape backslashes", () => {
    assert.strictEqual(transpileTag("\\sqrt{2}", "tex", true), "tex`\\sqrt{2}`");
  });
  it("raw template literal interpolates terminal backslashes", () => {
    assert.strictEqual(transpileTag("test\\", "", true), "`test${'\\\\'}`");
  });
  it("raw template literal interpolates backticks", () => {
    assert.strictEqual(transpileTag("`test`", "", true), "`${'`'}test${'`'}`");
    assert.strictEqual(transpileTag("``test``", "", true), "`${'``'}test${'``'}`");
    assert.strictEqual(transpileTag("\\`test\\`", "", true), "`\\`test\\``");
    assert.strictEqual(transpileTag("\\\\`test\\\\`", "", true), "`\\\\${'`'}test\\\\${'`'}`");
  });
});
