import assert from "node:assert";
import {relativeUrl} from "../src/url.js";

describe("relativeUrls", () => {
  it("respects absolute links", () => {
    assert.strictEqual(relativeUrl("/", "https://whatever"), "https://whatever");
    assert.strictEqual(relativeUrl("/", "http://example.org"), "http://example.org");
    assert.strictEqual(relativeUrl("/", "https://example.org/"), "https://example.org/");
  });
  it("return the expected result", () => {
    assert.strictEqual(relativeUrl("/", "/"), "./");
    assert.strictEqual(relativeUrl("/foo", "/"), "./");
    assert.strictEqual(relativeUrl("/foo.html", "/"), "./");
    assert.strictEqual(relativeUrl("/", "/foo"), "./foo");
    assert.strictEqual(relativeUrl("/", "/foo.html"), "./foo.html");
    assert.strictEqual(relativeUrl("/", "/foo/bar/baz"), "./foo/bar/baz");
    assert.strictEqual(relativeUrl("/foo", "/foo"), "./foo");
    assert.strictEqual(relativeUrl("/foo/", "/foo/"), "./");
    assert.strictEqual(relativeUrl("/foo", "/foo/"), "./foo/");
    assert.strictEqual(relativeUrl("/foo/", "/foo"), "../foo");
    assert.strictEqual(relativeUrl("/foo/bar", "/foo/bar"), "./bar");
    assert.strictEqual(relativeUrl("/foo/bar/", "/foo/bar/"), "./");
    assert.strictEqual(relativeUrl("/foo/bar", "/foo/bar/"), "./bar/");
    assert.strictEqual(relativeUrl("/foo/bar/", "/foo/bar"), "../bar");
    assert.strictEqual(relativeUrl("/foo", "/bar"), "./bar");
    assert.strictEqual(relativeUrl("/foo/bar", "/baz"), "../baz");
    assert.strictEqual(relativeUrl("/foo/bar", "/foo"), "../foo");
    assert.strictEqual(relativeUrl("/foo/bar", "/foo.csv"), "../foo.csv");
    assert.strictEqual(relativeUrl("/foo/bar", "/foo/"), "./");
    assert.strictEqual(relativeUrl("/foo/bar", "/baz/bar"), "../baz/bar");
    assert.strictEqual(relativeUrl("foo/bar", "baz/bar"), "../baz/bar");
    assert.strictEqual(relativeUrl("foo////baz", "baz//bar"), "../baz/bar");
  });
});
