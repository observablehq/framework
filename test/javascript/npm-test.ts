import assert from "node:assert";
import {getDependencyResolver, rewriteNpmImports} from "../../src/npm.js";
import {relativePath} from "../../src/path.js";
import {mockJsDelivr} from "../mocks/jsdelivr.js";

describe("getDependencyResolver(root, path, input)", () => {
  mockJsDelivr();
  it("finds /npm/ imports and re-resolves their versions", async () => {
    const root = "test/input/build/simple-public";
    const specifier = "/npm/d3-array@3.2.3/dist/d3-array.js";
    const resolver = await getDependencyResolver(root, "/_npm/d3@7.8.5/+esm.js", `import '${specifier}';\n`); // prettier-ignore
    assert.strictEqual(resolver(specifier), "../d3-array@3.2.4/dist/d3-array.js");
  });
  it("finds /npm/ import resolutions and re-resolves their versions", async () => {
    const root = "test/input/build/simple-public";
    const specifier = "/npm/d3-array@3.2.3/dist/d3-array.js";
    const resolver = await getDependencyResolver(root, "/_npm/d3@7.8.5/+esm.js", `import.meta.resolve('${specifier}');\n`); // prettier-ignore
    assert.strictEqual(resolver(specifier), "../d3-array@3.2.4/dist/d3-array.js");
  });
});

// prettier-ignore
describe("rewriteNpmImports(input, resolve)", () => {
  it("rewrites /npm/ imports to /_npm/", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'export * from "../../d3-array@3.2.4/dist/d3-array.js";\n');
  });
  it("rewrites /npm/…+esm imports to +esm.js", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'export * from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites /npm/ imports to a relative path", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'import "../../d3-array@3.2.4/dist/d3-array.js";\n');
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/d3.js", v)), 'import "../d3-array@3.2.4/dist/d3-array.js";\n');
  });
  it("rewrites named imports", () => {
    assert.strictEqual(rewriteNpmImports('import {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import {sort} from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites empty imports", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites default imports", () => {
    assert.strictEqual(rewriteNpmImports('import d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import d3 from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites namespace imports", () => {
    assert.strictEqual(rewriteNpmImports('import * as d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import * as d3 from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites named exports", () => {
    assert.strictEqual(rewriteNpmImports('export {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'export {sort} from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites namespace exports", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'export * from "../d3-array@3.2.4/+esm.js";\n');
  });
  it("rewrites dynamic imports with static module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import("/npm/d3-array@3.2.4/+esm");\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import("../d3-array@3.2.4/+esm.js");\n');
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n", (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import("../d3-array@3.2.4/+esm.js");\n');
    assert.strictEqual(rewriteNpmImports("import('/npm/d3-array@3.2.4/+esm');\n", (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import("../d3-array@3.2.4/+esm.js");\n');
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
  it("strips the sourceMappingURL declaration", () => {
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n//# sourceMappingURL=index.js.map', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
    assert.strictEqual(rewriteNpmImports('import(`/npm/d3-array@${"3.2.4"}/+esm`);\n//# sourceMappingURL=index.js.map\n', (v) => resolve("/_npm/d3@7.8.5/+esm.js", v)), 'import(`/npm/d3-array@${"3.2.4"}/+esm`);\n');
  });
});

function resolve(path: string, specifier: string): string {
  if (!specifier.startsWith("/npm/")) return specifier;
  specifier = `/_npm/${specifier.slice("/npm/".length)}`;
  if (specifier.endsWith("/+esm")) specifier += ".js";
  return relativePath(path, specifier);
}
