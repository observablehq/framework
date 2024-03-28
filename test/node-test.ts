import assert from "node:assert";
import {existsSync} from "node:fs";
import {rm} from "node:fs/promises";
import {extractNodeSpecifier, resolveNodeImport, resolveNodeImports} from "../src/node.js";

describe("resolveNodeImport(root, spec)", () => {
  before(async () => {
    if (existsSync("docs/.observablehq/cache/_node")) {
      await rm("docs/.observablehq/cache/_node", {recursive: true});
    }
  });
  it("resolves the version of a direct dependency", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "d3-array"), "/_node/d3-array@3.2.4/index.js");
    assert.deepStrictEqual(await resolveNodeImport("docs", "mime"), "/_node/mime@4.0.1/index.js");
  });
  it("allows entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "mime/lite"), "/_node/mime@4.0.1/lite.js");
  });
  it("allows non-javascript entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "glob/package.json"), "/_node/glob@10.3.10/package.json");
  });
  it("does not allow version ranges", async () => {
    await assert.rejects(() => resolveNodeImport("docs", "mime@4"), /Cannot find module/);
  });
});

describe("resolveNodeImports(root, path)", () => {
  before(async () => {
    if (existsSync("docs/.observablehq/cache/_node")) {
      await rm("docs/.observablehq/cache/_node", {recursive: true});
    }
  });
  it("resolves the imports of a dependency", async () => {
    assert.deepStrictEqual(await resolveNodeImports("docs", await resolveNodeImport("docs", "d3-array")), [
      {
        method: "static",
        name: "../internmap@2.0.3/index.js",
        type: "local"
      }
    ]);
  });
  it("ignores non-JavaScript paths", async () => {
    assert.deepStrictEqual(await resolveNodeImports("docs", await resolveNodeImport("docs", "glob/package.json")), []);
  });
});

describe("extractNodeSpecifier(path)", () => {
  it("returns the node specifier from the given path", () => {
    assert.strictEqual(extractNodeSpecifier("/_node/d3-array@3.2.4/index.js"), "d3-array@3.2.4/index.js");
  });
});
