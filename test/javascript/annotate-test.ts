// This file is not suffixed with '-test'; it expects to run with an extra
import assert from "node:assert";
import type {TranspileModuleOptions} from "../../src/javascript/transpile.js";
import {transpileModule} from "../../src/javascript/transpile.js";
import {fromJsDelivrPath, rewriteNpmImports} from "../../src/npm.js";
import {relativePath} from "../../src/path.js";

export function mockAnnotateFileEnv(value = true) {
  let annotateFileEnvBefore: string | undefined;
  before(() => {
    annotateFileEnvBefore = process.env["OBSERVABLE_ANNOTATE_FILES"];
    process.env["OBSERVABLE_ANNOTATE_FILES"] = JSON.stringify(value);
  });
  after(() => {
    process.env["OBSERVABLE_ANNOTATE_FILES"] = annotateFileEnvBefore;
  });
}

// prettier-ignore
describe("annotates", () => {
  mockAnnotateFileEnv(true);
  const options: TranspileModuleOptions = {root: "src", path: "test.js"};
  it("npm imports", async () => {
    const input = 'import "npm:d3-array";';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'import "../_npm/d3-array@3.2.4/_esm.js"/* observablehq-file */;');
  });
  it("node imports", async () => {
    const input = 'import "d3-array";';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'import "../_node/d3-array@3.2.4/index.js"/* observablehq-file */;');
  });
  it("dynamic imports", async () => {
    const input = 'import("d3-array");';
    const output = (await transpileModule(input, options)).split("\n").pop()!;
    assert.strictEqual(output, 'import("../_node/d3-array@3.2.4/index.js"/* observablehq-file */);');
  });
   it("/npm/ exports", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'export * from "../../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
   });
   it("/npm/ imports", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'import "../../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/d3.js", v)), 'import "../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
   });
   it("named imports", () => {
     assert.strictEqual(rewriteNpmImports('import {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import {sort} from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("empty imports", () => {
     assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("default imports", () => {
     assert.strictEqual(rewriteNpmImports('import d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import d3 from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("namespace imports", () => {
     assert.strictEqual(rewriteNpmImports('import * as d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import * as d3 from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("named exports", () => {
     assert.strictEqual(rewriteNpmImports('export {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'export {sort} from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("namespace exports", () => {
     assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'export * from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
   });
   it("dynamic imports with static module specifiers", () => {
     assert.strictEqual(rewriteNpmImports('import("/npm/d3-array@3.2.4/+esm");\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
     assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
     assert.strictEqual(rewriteNpmImports("import('/npm/d3-array@3.2.4/+esm');\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
   });
});

function resolve(path: string, specifier: string): string {
  return specifier.startsWith("/npm/") ? relativePath(path, fromJsDelivrPath(specifier)) : specifier;
}
