import assert from "node:assert";
import {relativePath, resolvePath} from "../src/path.js";

describe("resolvePath", () => {
  it("returns the path to the specified target within the source root", () => {
    assert.strictEqual(resolvePath("foo", "baz"), "/baz");
    assert.strictEqual(resolvePath("./foo", "./baz"), "/baz");
    assert.strictEqual(resolvePath("/foo", "baz"), "/baz");
    assert.strictEqual(resolvePath("/foo", "./baz"), "/baz");
    assert.strictEqual(resolvePath("foo/bar", "baz"), "/foo/baz");
    assert.strictEqual(resolvePath("./foo/bar", "./baz"), "/foo/baz");
    assert.strictEqual(resolvePath("/foo/bar", "baz"), "/foo/baz");
    assert.strictEqual(resolvePath("/foo/bar", "./baz"), "/foo/baz");
  });
  it("allows paths outside the root", () => {
    assert.strictEqual(resolvePath("foo", "../baz"), "../baz");
    assert.strictEqual(resolvePath("foo/bar", "../../baz"), "../baz");
    assert.strictEqual(resolvePath("foo/bar", "/../baz"), "../baz");
  });
  it("considers paths starting with slash as relative to the source root", () => {
    assert.strictEqual(resolvePath("foo/bar", "/baz"), "/baz");
    assert.strictEqual(resolvePath("./foo/bar", "/baz"), "/baz");
    assert.strictEqual(resolvePath("/foo/bar", "/baz"), "/baz");
  });
  it("respects the specified root", () => {
    assert.strictEqual(resolvePath("_import", "foo/bar", "baz"), "/_import/foo/baz");
    assert.strictEqual(resolvePath("_import", "foo/bar", "../baz"), "/_import/baz");
    assert.strictEqual(resolvePath("_import", "foo/bar", "../../baz"), "/baz");
    assert.strictEqual(resolvePath("_import", "foo/bar", "../../../baz"), "../baz");
  });
});

describe("relativePath", () => {
  it("respects absolute links", () => {
    assert.strictEqual(relativePath("/", "https://whatever"), "https://whatever");
    assert.strictEqual(relativePath("/", "http://example.org"), "http://example.org");
    assert.strictEqual(relativePath("/", "https://example.org/"), "https://example.org/");
    assert.strictEqual(relativePath("/", "mailto:hello@example.org"), "mailto:hello@example.org");
  });
  it("return the expected result", () => {
    assert.strictEqual(relativePath("/", "/"), "./");
    assert.strictEqual(relativePath("/foo", "/"), "./");
    assert.strictEqual(relativePath("/foo.html", "/"), "./");
    assert.strictEqual(relativePath("/", "/foo"), "./foo");
    assert.strictEqual(relativePath("/", "/foo.html"), "./foo.html");
    assert.strictEqual(relativePath("/", "/foo/bar/baz"), "./foo/bar/baz");
    assert.strictEqual(relativePath("/foo", "/foo"), "./foo");
    assert.strictEqual(relativePath("/foo/", "/foo/"), "./");
    assert.strictEqual(relativePath("/foo", "/foo/"), "./foo/");
    assert.strictEqual(relativePath("/foo/", "/foo"), "../foo");
    assert.strictEqual(relativePath("/foo/bar", "/foo/bar"), "./bar");
    assert.strictEqual(relativePath("/foo/bar/", "/foo/bar/"), "./");
    assert.strictEqual(relativePath("/foo/bar", "/foo/bar/"), "./bar/");
    assert.strictEqual(relativePath("/foo/bar/", "/foo/bar"), "../bar");
    assert.strictEqual(relativePath("/foo", "/bar"), "./bar");
    assert.strictEqual(relativePath("/foo/bar", "/baz"), "../baz");
    assert.strictEqual(relativePath("/foo/bar", "/foo"), "../foo");
    assert.strictEqual(relativePath("/foo/bar", "/foo.csv"), "../foo.csv");
    assert.strictEqual(relativePath("/foo/bar", "/foo/"), "./");
    assert.strictEqual(relativePath("/foo/bar", "/baz/bar"), "../baz/bar");
    assert.strictEqual(relativePath("foo", "bar"), "./bar");
    assert.strictEqual(relativePath("foo/bar", "baz"), "../baz");
    assert.strictEqual(relativePath("foo/bar", "foo"), "../foo");
    assert.strictEqual(relativePath("foo/bar", "foo.csv"), "../foo.csv");
    assert.strictEqual(relativePath("foo/bar", "foo/"), "./");
    assert.strictEqual(relativePath("foo/bar", "baz/bar"), "../baz/bar");
    assert.strictEqual(relativePath("foo////baz", "baz//bar"), "../baz/bar");
  });
});
