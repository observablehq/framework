import assert from "node:assert";
import {existsSync} from "node:fs";
import {rm} from "node:fs/promises";
import {resolveNodeImport, resolveNodeImports} from "../src/node.js";

describe("resolveNodeImport(root, spec)", () => {
  const importRoot = "../../input/packages/.observablehq/cache";
  before(async () => {
    await rm("docs/.observablehq/cache/_node", {recursive: true, force: true});
    await rm("test/input/packages/.observablehq/cache", {recursive: true, force: true});
  });
  it("resolves the version of a direct dependency", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "d3-array"), "/_node/d3-array@3.2.4/a6083063/d3-array.js");
    assert.deepStrictEqual(await resolveNodeImport("docs", "mime"), "/_node/mime@4.0.1/2c7c74a5/mime.js");
  });
  it("allows entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "mime/lite"), "/_node/mime@4.0.1/148dd32d/lite.js");
  });
  it("allows non-javascript entry points", async () => {
    assert.deepStrictEqual(await resolveNodeImport("docs", "glob/package.json"), "/_node/glob@10.3.10/eb5efdd4/package.json"); // prettier-ignore
  });
  it("does not allow version ranges", async () => {
    await assert.rejects(() => resolveNodeImport("docs", "mime@4"), /Cannot find module/);
  });
  it("bundles a package with a shorthand export", async () => {
    const im = await resolveNodeImport("test/input/packages", "test-shorthand-export");
    assert.strictEqual(im, "/_node/test-shorthand-export@1.0.0/5c9d6142/test-shorthand-export.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}${im}`)).name, "test-shorthand-export"); // prettier-ignore
  });
  it("bundles a package with an import conditional export", async () => {
    const im = await resolveNodeImport("test/input/packages", "test-import-condition");
    assert.strictEqual(im, "/_node/test-import-condition@1.0.0/ae19a520/test-import-condition.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/${im}`)).name, "test-import-condition:import"); // prettier-ignore
  });
  it("bundles a package with a browser field", async () => {
    const im = await resolveNodeImport("test/input/packages", "test-browser-field");
    assert.strictEqual(im, "/_node/test-browser-field@1.0.0/ccc4528f/test-browser-field.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/${im}`)).name, "test-browser-field:browser"); // prettier-ignore
  });
  it("bundles a package with a browser map", async () => {
    const im = await resolveNodeImport("test/input/packages", "test-browser-map");
    assert.strictEqual(im, "/_node/test-browser-map@1.0.0/28e99e1e/test-browser-map.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/${im}`)).name, "test-browser-map:browser"); // prettier-ignore
  });
  it("bundles a package with a browser conditional export", async () => {
    const im = await resolveNodeImport("test/input/packages", "test-browser-condition");
    assert.strictEqual(im, "/_node/test-browser-condition@1.0.0/53e104e3/test-browser-condition.js"); // prettier-ignore
    assert.strictEqual((await import(`${importRoot}/${im}`)).name, "test-browser-condition:browser"); // prettier-ignore
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
        name: "../../internmap@2.0.3/e0fb710d/internmap.js",
        type: "local"
      }
    ]);
  });
  it("ignores non-JavaScript paths", async () => {
    assert.deepStrictEqual(await resolveNodeImports("docs", await resolveNodeImport("docs", "glob/package.json")), []);
  });
});
