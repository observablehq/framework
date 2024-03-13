import assert from "node:assert";
import {getTypeScriptPath, transpileTypeScript} from "../src/typescript.js";

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

describe("getTypeScriptPath(path)", () => {
  it("replaces .js with .ts", () => {
    assert.strictEqual(getTypeScriptPath("test.js"), "test.ts");
  });
  it("throws if the path does not end with .js", () => {
    assert.throws(() => getTypeScriptPath("test.csv"), /expected \.js/);
  });
});
