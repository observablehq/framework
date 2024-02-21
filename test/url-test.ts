import assert from "node:assert";
import {UrlPath as UP} from "../src/brandedPath.js";
import {relativeUrl} from "../src/url.js";

describe("relativeUrls", () => {
  it("respects absolute links", () => {
    assert.strictEqual(relativeUrl(UP("/"), UP("https://whatever")), "https://whatever");
    assert.strictEqual(relativeUrl(UP("/"), UP("http://example.org")), "http://example.org");
    assert.strictEqual(relativeUrl(UP("/"), UP("https://example.org/")), "https://example.org/");
    assert.strictEqual(relativeUrl(UP("/"), UP("mailto:hello@example.org")), "mailto:hello@example.org");
  });
  it("return the expected result", () => {
    assert.strictEqual(relativeUrl(UP("/"), UP("/")), "./");
    assert.strictEqual(relativeUrl(UP("/foo"), UP("/")), "./");
    assert.strictEqual(relativeUrl(UP("/foo.html"), UP("/")), "./");
    assert.strictEqual(relativeUrl(UP("/"), UP("/foo")), "./foo");
    assert.strictEqual(relativeUrl(UP("/"), UP("/foo.html")), "./foo.html");
    assert.strictEqual(relativeUrl(UP("/"), UP("/foo/bar/baz")), "./foo/bar/baz");
    assert.strictEqual(relativeUrl(UP("/foo"), UP("/foo")), "./foo");
    assert.strictEqual(relativeUrl(UP("/foo/"), UP("/foo/")), "./");
    assert.strictEqual(relativeUrl(UP("/foo"), UP("/foo/")), "./foo/");
    assert.strictEqual(relativeUrl(UP("/foo/"), UP("/foo")), "../foo");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/foo/bar")), "./bar");
    assert.strictEqual(relativeUrl(UP("/foo/bar/"), UP("/foo/bar/")), "./");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/foo/bar/")), "./bar/");
    assert.strictEqual(relativeUrl(UP("/foo/bar/"), UP("/foo/bar")), "../bar");
    assert.strictEqual(relativeUrl(UP("/foo"), UP("/bar")), "./bar");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/baz")), "../baz");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/foo")), "../foo");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/foo.csv")), "../foo.csv");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/foo/")), "./");
    assert.strictEqual(relativeUrl(UP("/foo/bar"), UP("/baz/bar")), "../baz/bar");
    assert.strictEqual(relativeUrl(UP("foo"), UP("bar")), "./bar");
    assert.strictEqual(relativeUrl(UP("foo/bar"), UP("baz")), "../baz");
    assert.strictEqual(relativeUrl(UP("foo/bar"), UP("foo")), "../foo");
    assert.strictEqual(relativeUrl(UP("foo/bar"), UP("foo.csv")), "../foo.csv");
    assert.strictEqual(relativeUrl(UP("foo/bar"), UP("foo/")), "./");
    assert.strictEqual(relativeUrl(UP("foo/bar"), UP("baz/bar")), "../baz/bar");
    assert.strictEqual(relativeUrl(UP("foo////baz"), UP("baz//bar")), "../baz/bar");
  });
});
