import assert from "node:assert";
import {rm} from "node:fs/promises";
import {join} from "node:path/posix";
import {extractNodeSpecifier, isNodeBuiltin, resolveNodeImport, resolveNodeImports} from "../src/node.js";

describe("isNodeBuiltin(specifier)", () => {
  it("returns true for node: specifiers", () => {
    assert.strictEqual(isNodeBuiltin("node:fs"), true);
    assert.strictEqual(isNodeBuiltin("node:path"), true);
    assert.strictEqual(isNodeBuiltin("node:path/posix"), true);
  });
  it("returns false for what are probably not node built-ins", () => {
    assert.strictEqual(isNodeBuiltin(""), false);
    assert.strictEqual(isNodeBuiltin("/fs"), false);
    assert.strictEqual(isNodeBuiltin("./fs"), false);
    assert.strictEqual(isNodeBuiltin("/node:fs"), false);
    assert.strictEqual(isNodeBuiltin("./node:fs"), false);
    assert.strictEqual(isNodeBuiltin("foo"), false);
    assert.strictEqual(isNodeBuiltin("notnode:fs"), false);
  });
  it("returns true for certain know built-in modules:", () => {
    assert.strictEqual(isNodeBuiltin("fs"), true);
    assert.strictEqual(isNodeBuiltin("path"), true);
    assert.strictEqual(isNodeBuiltin("path/posix"), true);
  });
  it("considers submodules such as fs/promises", () => {
    assert.strictEqual(isNodeBuiltin("fs/promises"), true);
    assert.strictEqual(isNodeBuiltin("fs/whatever"), true);
  });
});

describe("resolveNodeImport(root, spec) with top-level node_modules", () => {
  const testRoot = "test/output/node-import"; // unique to this test
  before(() => rm(join(testRoot, ".observablehq/cache/_node"), {recursive: true, force: true}));
  it("resolves the version of a direct dependency", async () => {
    assert.deepStrictEqual(await resolveNodeImport(testRoot, "d3-array"), "/_node/d3-array@3.2.4/index.js");
    assert.deepStrictEqual(await resolveNodeImport(testRoot, "mime"), "/_node/mime@4.0.3/index.js");
  });
  it("allows entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport(testRoot, "mime/lite"), "/_node/mime@4.0.3/lite.js");
  });
  it("allows non-javascript entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport(testRoot, "glob/package.json"), "/_node/glob@10.3.15/package.json");
  });
  it("does not allow version ranges", async () => {
    await assert.rejects(() => resolveNodeImport(testRoot, "mime@4"), /Cannot find module/);
  });
});

describe("resolveNodeImport(root, spec) with test node_modules", () => {
  const testRoot = "test/input/packages"; // unique to this test
  const importRoot = "../../input/packages/.observablehq/cache";
  before(() => rm(join(testRoot, ".observablehq/cache/_node"), {recursive: true, force: true}));
  it("bundles a package with a shorthand export", async () => {
    assert.strictEqual(await resolveNodeImport(testRoot, "test-shorthand-export"), "/_node/test-shorthand-export@1.0.0/index.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/_node/test-shorthand-export@1.0.0/index.js`)).name, "test-shorthand-export"); // prettier-ignore
  });
  it("bundles a package with an import conditional export", async () => {
    assert.strictEqual(await resolveNodeImport(testRoot, "test-import-condition"), "/_node/test-import-condition@1.0.0/index.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/_node/test-import-condition@1.0.0/index.js`)).name, "test-import-condition:import"); // prettier-ignore
  });
  it("bundles a package with a browser field", async () => {
    assert.strictEqual(await resolveNodeImport(testRoot, "test-browser-field"), "/_node/test-browser-field@1.0.0/index.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/_node/test-browser-field@1.0.0/index.js`)).name, "test-browser-field:browser"); // prettier-ignore
  });
  it("bundles a package with a browser map", async () => {
    assert.strictEqual(await resolveNodeImport(testRoot, "test-browser-map"), "/_node/test-browser-map@1.0.0/index.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/_node/test-browser-map@1.0.0/index.js`)).name, "test-browser-map:browser"); // prettier-ignore
  });
  it("bundles a package with a browser conditional export", async () => {
    assert.strictEqual(await resolveNodeImport(testRoot, "test-browser-condition"), "/_node/test-browser-condition@1.0.0/index.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/_node/test-browser-condition@1.0.0/index.js`)).name, "test-browser-condition:browser"); // prettier-ignore
  });
});

describe("resolveNodeImports(root, path)", () => {
  const testRoot = "test/output/node-imports"; // unique to this test
  before(() => rm(join(testRoot, ".observablehq/cache/_node"), {recursive: true, force: true}));
  it("resolves the imports of a dependency", async () => {
    assert.deepStrictEqual(await resolveNodeImports(testRoot, await resolveNodeImport(testRoot, "d3-array")), [
      {method: "static", name: "../internmap@2.0.3/index.js", type: "local"}
    ]);
  });
  it("ignores non-JavaScript paths", async () => {
    assert.deepStrictEqual(
      await resolveNodeImports(testRoot, await resolveNodeImport(testRoot, "glob/package.json")),
      []
    );
  });
});

describe("extractNodeSpecifier(path)", () => {
  it("returns the node specifier from the given path", () => {
    assert.strictEqual(extractNodeSpecifier("/_node/d3-array@3.2.4/index.js"), "d3-array@3.2.4/index.js");
  });
});
