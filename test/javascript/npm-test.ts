import assert from "node:assert";
import {rewriteNpmImports} from "../../src/npm.js";

// prettier-ignore
describe("rewriteNpmImports(input, path)", () => {
  it("rewrites /npm/ imports to /_npm/", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/dist/d3-array.js";\n', "/_npm/d3@7.8.5/dist/d3.js"), 'export * from "../../d3-array@3.2.4/dist/d3-array.js";\n');
  });
  it("rewrites /npm/…+esm imports to +esm.js", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'export * from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites /npm/ imports to a relative path", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', "/_npm/d3@7.8.5/dist/d3.js"), 'import "../../d3-array@3.2.4/dist/d3-array.js";\n');
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', "/_npm/d3@7.8.5/d3.js"), 'import "../d3-array@3.2.4/dist/d3-array.js";\n');
  });
  it("rewrites named imports", () => {
    assert.strictEqual(rewriteNpmImports('import {sort} from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'import {sort} from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites empty imports", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'import "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites default imports", () => {
    assert.strictEqual(rewriteNpmImports('import d3 from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'import d3 from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites namespace imports", () => {
    assert.strictEqual(rewriteNpmImports('import * as d3 from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'import * as d3 from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites named exports", () => {
    assert.strictEqual(rewriteNpmImports('export {sort} from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'export {sort} from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites namespace exports", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', "/_npm/d3@7.8.5/+esm.js"), 'export * from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites dynamic imports with static module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import("/npm/d3-array@3.2.4/+esm");\n', "/_npm/d3@7.8.5/+esm.js"), 'import("../d3-array@3.2.4/+esm.js");\n');
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n", "/_npm/d3@7.8.5/+esm.js"), 'import("../d3-array@3.2.4/+esm.js");\n');
    assert.strictEqual(rewriteNpmImports("import('/npm/d3-array@3.2.4/+esm');\n", "/_npm/d3@7.8.5/+esm.js"), 'import("../d3-array@3.2.4/+esm.js");\n');
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n', "/_npm/d3@7.8.5/+esm.js"), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n', "/_npm/d3@7.8.5/+esm.js"), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
  it("strips the sourceMappingURL declaration", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n//# sourceMappingURL=index.js.map', "/_npm/d3@7.8.5/+esm.js"), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n//# sourceMappingURL=index.js.map\n', "/_npm/d3@7.8.5/+esm.js"), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
});
