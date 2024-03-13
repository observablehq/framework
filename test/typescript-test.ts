import assert from "node:assert";
import {getTypeScriptPath, transpileTypeScript} from "../src/typescript.js";

describe("transpileTypeScript(input)", () => {
  it("transpiles an arthimetic expression", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number"), "1 + 2");
  });
  it("transpiles an arthimetic expression with whitespace", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number "), "1 + 2");
  });
  it("transpiles an arthimetic expression with comment", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number // comment"), "1 + 2");
  });
  it("preserves the trailing semicolon", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number;"), "1 + 2;\n");
  });
  it("preserves the trailing semicolon with whitepsace", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number; "), "1 + 2;\n");
  });
  it.skip("preserves the trailing semicolon with comment", () => {
    assert.strictEqual(transpileTypeScript("1 + 2 as number; // comment"), "1 + 2;\n");
  });
  it("transpiles empty input", () => {
    assert.strictEqual(transpileTypeScript(""), "");
  });
  it("transpiles a function call", () => {
    assert.strictEqual(transpileTypeScript("sum(1, 2 as number)"), "sum(1, 2)");
  });
  it("transpiles an import", () => {
    assert.strictEqual(transpileTypeScript('import {sum} from "./sum.js";'), 'import { sum } from "./sum.js";\n');
  });
  it("transpiles a type import", () => {
    assert.strictEqual(transpileTypeScript('import type {sum} from "./sum.js";'), "");
  });
  it("transpiles an import and statement", () => {
    assert.strictEqual(
      transpileTypeScript('import {sum} from "./sum.js"; sum(1, 2);'),
      'import { sum } from "./sum.js";\nsum(1, 2);\n'
    );
  });
});

describe("getTypeScriptPath(path)", () => {
  it("replaces .js with .ts", () => {
    assert.strictEqual(getTypeScriptPath("test.js"), "test.ts");
  });
  it("throws if the path does not end with .js", () => {
    assert.throws(() => getTypeScriptPath("test.csv"), /expected \.js/);
  });
});
