import assert from "node:assert";
import {dirname, join} from "node:path";
import {isLocalImport} from "../src/javascript/imports.js";

function pathFromRoot(value: string, root: string, sourcePath: string) {
  return join(root + "/", value.startsWith("/") ? "." : dirname(sourcePath), value);
}

describe("isLocalImport", () => {
  it("identifies a local import", async () => {
    const root = "docs";
    const sourcePath = "/hello.md";
    const importValue = "./helpers.js";
    assert.equal(pathFromRoot(importValue, root, sourcePath), "docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("relative paths are correctly handled", async () => {
    const root = "docs";
    const sourcePath = "/subDocs/hello.md";
    const importValue = "./helpers.js";
    assert.equal(pathFromRoot(importValue, root, sourcePath), "docs/subDocs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("root and sourcePath arguments can correctly handle slashes", async () => {
    const root = "docs/";
    const sourcePath = "/hello.md/";
    const importValue = "./helpers.js";
    assert.equal(pathFromRoot(importValue, root, sourcePath), "docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("identifies a local import from a nested sourcePath", async () => {
    const root = "docs";
    const sourcePath = "/subDocs/subDocs2/hello.md";
    const importValue = "../../random.js";
    assert.equal(pathFromRoot(importValue, root, sourcePath), "docs/random.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("cannot go to an ancestor directory beyond the root", async () => {
    const root = "docs";
    const sourcePath = "/hello.md";
    const importValue1 = "../../../random.js";
    assert.equal(pathFromRoot(importValue1, root, sourcePath), "../../random.js");
    assert.equal(isLocalImport(importValue1, sourcePath), false);
    const importValue2 = "./../../random.js";
    assert.equal(pathFromRoot(importValue2, root, sourcePath), "../random.js");
    assert.equal(isLocalImport(importValue2, sourcePath), false);
    const importValue3 = "/../random.js";
    assert.equal(pathFromRoot(importValue3, root, sourcePath), "random.js");
    assert.equal(isLocalImport(importValue3, sourcePath), false);
  });
});
