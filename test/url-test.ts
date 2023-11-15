import assert from "node:assert";
import {relativeUrl} from "../src/url.js";

describe("relativeUrls", () => {
  it("respects absolute links", () => {
    assert.strictEqual(relativeUrl("/", "https://whatever"), "https://whatever");
  });
  it("return the expected result", () => {
    assert.strictEqual(relativeUrl("/", "/"), "./");
    assert.strictEqual(relativeUrl("/foo", "/"), "./");
    assert.strictEqual(relativeUrl("/", "/foo"), "./foo");
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
    assert.strictEqual(relativeUrl("/foo/bar", "/foo/"), "./");
    assert.strictEqual(relativeUrl("/foo/bar", "/baz/bar"), "../baz/bar");
    assert.strictEqual(relativeUrl("foo/bar", "baz/bar"), "../baz/bar");
    assert.strictEqual(relativeUrl("foo////baz", "baz//bar"), "../baz/bar");
  });
});
