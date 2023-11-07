import assert from "node:assert";
import {transpileTag} from "../src/tag.js";

describe("transpileTag(input)", () => {
  it("bare template literal", () => {
    assert.strictEqual(transpileTag("1 + 2"), "`1 + 2`");
  });
  it("tagged template literal", () => {
    assert.strictEqual(transpileTag("1 + 2", "tag"), "tag`1 + 2`");
  });
  it("embedded expression", () => {
    assert.strictEqual(transpileTag("1 + ${2}"), "`1 + ${2}`");
  });
  it("escaped embedded expression", () => {
    assert.strictEqual(transpileTag("1 + $\\{2}"), "`1 + $\\{2}`");
  });
});
