import assert from "node:assert";
import {isPathImport, relativePath, resolveLocalPath, resolvePath} from "../src/path.js";

describe("resolvePath(source, target)", () => {
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

describe("resolveLocalPath(source, target)", () => {
  it("returns null for URLs", () => {
    assert.strictEqual(resolveLocalPath("foo", "https://example.com"), null);
    assert.strictEqual(resolveLocalPath("foo", "mailto:name@example.com"), null);
    assert.strictEqual(resolveLocalPath("foo", "data:whatever"), null);
    assert.strictEqual(resolveLocalPath("foo", "blob:file"), null);
    assert.strictEqual(resolveLocalPath("foo", "npm:@observablehq/example"), null);
    assert.strictEqual(resolveLocalPath("foo", "npm:example"), null);
  });
  it("returns null for anchor fragments", () => {
    assert.strictEqual(resolveLocalPath("foo", "#bar"), null);
  });
  it("returns null for paths outside the root", () => {
    assert.strictEqual(resolveLocalPath("foo", "../bar"), null);
    assert.strictEqual(resolveLocalPath("foo/bar", "../../baz"), null);
    assert.strictEqual(resolveLocalPath("foo/bar", "/../baz"), null);
    assert.strictEqual(resolveLocalPath("/foo", "../bar"), null);
    assert.strictEqual(resolveLocalPath("/foo/bar", "../../baz"), null);
    assert.strictEqual(resolveLocalPath("/foo/bar", "/../baz"), null);
  });
  it("otherwise returns the resolved path from the source root", () => {
    assert.strictEqual(resolveLocalPath("foo", "bar"), "/bar");
    assert.strictEqual(resolveLocalPath("foo", "./bar"), "/bar");
    assert.strictEqual(resolveLocalPath("/foo", "./bar"), "/bar");
    assert.strictEqual(resolveLocalPath("/foo", "bar"), "/bar");
    assert.strictEqual(resolveLocalPath("/foo", "./bar"), "/bar");
    assert.strictEqual(resolveLocalPath("/foo", "/bar"), "/bar");
    assert.strictEqual(resolveLocalPath("foo/bar", "baz"), "/foo/baz");
    assert.strictEqual(resolveLocalPath("foo/bar", "./baz"), "/foo/baz");
    assert.strictEqual(resolveLocalPath("/foo/bar", "./baz"), "/foo/baz");
    assert.strictEqual(resolveLocalPath("/foo/bar", "baz"), "/foo/baz");
    assert.strictEqual(resolveLocalPath("/foo/bar", "./baz"), "/foo/baz");
    assert.strictEqual(resolveLocalPath("/foo/bar", "/baz"), "/baz");
    assert.strictEqual(resolveLocalPath("/foo/bar", "../baz"), "/baz");
  });
});

describe("relativePath(source, target)", () => {
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

describe("isPathImport(specifier)", () => {
  it("returns true for paths starting with dot-slash (./)", () => {
    assert.strictEqual(isPathImport("./foo"), true);
    assert.strictEqual(isPathImport("./foo/bar"), true);
  });
  it("returns true for paths starting with dot-dot-slash (../)", () => {
    assert.strictEqual(isPathImport("../foo"), true);
    assert.strictEqual(isPathImport("../foo/bar"), true);
  });
  it("returns true for paths starting with slash (/)", () => {
    assert.strictEqual(isPathImport("/"), true);
    assert.strictEqual(isPathImport("/foo"), true);
    assert.strictEqual(isPathImport("/foo/bar"), true);
  });
  it("returns false for other paths", () => {
    assert.strictEqual(isPathImport(""), false);
    assert.strictEqual(isPathImport("#foo"), false);
    assert.strictEqual(isPathImport("foo"), false);
    assert.strictEqual(isPathImport("foo:bar"), false);
    assert.strictEqual(isPathImport("foo://bar"), false);
  });
});
