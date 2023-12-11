import assert from "node:assert";
import {transpileTypeScript} from "../src/tag.js";

describe("transpileTypeScript(input)", () => {
  it("basic", () => {
    assert.strictEqual(transpileTypeScript("1 + 2"), "1 + 2");
  });
  it("empty", () => {
    assert.strictEqual(transpileTypeScript(""), "");
  });
  it("function call", () => {
    assert.strictEqual(transpileTypeScript("sum(1, 2)"), "sum(1, 2)");
  });
  it("single import", () => {
    assert.strictEqual(transpileTypeScript('import {sum} from "./sum.ts";'), 'import { sum } from "./sum.ts";\n');
  });
  it("import and value", () => {
    assert.strictEqual(
      transpileTypeScript('import {sum} from "./sum.ts"; sum(1, 2)'),
      'import { sum } from "./sum.ts";\nsum(1, 2)'
    );
  });
});
