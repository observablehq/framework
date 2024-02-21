import assert from "node:assert";
import {FilePath, UrlPath} from "../src/brandedPath.js";
import {isLocalImport} from "../src/javascript/imports.js";
import {resolvePath} from "../src/url.js";

describe("isLocalImport", () => {
  it("identifies a local import", async () => {
    const root = FilePath("docs");
    const sourcePath = FilePath("/hello.md");
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue)), "docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("relative paths are correctly handled", async () => {
    const root = FilePath("docs");
    const sourcePath = FilePath("/subDocs/hello.md");
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue)), "docs/subDocs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("root and sourcePath arguments can correctly handle slashes", async () => {
    const root = FilePath("docs/");
    const sourcePath = FilePath("/hello.md/");
    const importValue = "./helpers.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue)), "docs/helpers.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("identifies a local import from a nested sourcePath", async () => {
    const root = FilePath("docs");
    const sourcePath = FilePath("/subDocs/subDocs2/hello.md");
    const importValue = "../../random.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue)), "docs/random.js");
    assert(isLocalImport(importValue, sourcePath));
  });
  it("cannot go to an ancestor directory beyond the root", async () => {
    const root = FilePath("docs");
    const sourcePath = FilePath("/hello.md");
    const importValue1 = "../../../random.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue1)), FilePath("../../random.js"));
    assert.equal(isLocalImport(importValue1, sourcePath), false);
    const importValue2 = "./../../random.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue2)), "../random.js");
    assert.equal(isLocalImport(importValue2, sourcePath), false);
    const importValue3 = "/../random.js";
    assert.equal(resolvePath(root, sourcePath, UrlPath(importValue3)), "random.js");
    assert.equal(isLocalImport(importValue3, sourcePath), false);
  });
});
