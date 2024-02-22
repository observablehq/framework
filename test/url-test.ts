import assert from "node:assert";
import {UrlPath} from "../src/brandedPath.js";
import {relativeUrl} from "../src/url.js";

describe("relativeUrls", () => {
  it("respects absolute links", () => {
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("https://whatever")), "https://whatever");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("http://example.org")), "http://example.org");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("https://example.org/")), "https://example.org/");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("mailto:hello@example.org")), "mailto:hello@example.org");
  });
  it("return the expected result", () => {
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/foo"), UrlPath("/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/foo.html"), UrlPath("/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("/foo")), "./foo");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("/foo.html")), "./foo.html");
    assert.strictEqual(relativeUrl(UrlPath("/"), UrlPath("/foo/bar/baz")), "./foo/bar/baz");
    assert.strictEqual(relativeUrl(UrlPath("/foo"), UrlPath("/foo")), "./foo");
    assert.strictEqual(relativeUrl(UrlPath("/foo/"), UrlPath("/foo/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/foo"), UrlPath("/foo/")), "./foo/");
    assert.strictEqual(relativeUrl(UrlPath("/foo/"), UrlPath("/foo")), "../foo");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/foo/bar")), "./bar");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar/"), UrlPath("/foo/bar/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/foo/bar/")), "./bar/");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar/"), UrlPath("/foo/bar")), "../bar");
    assert.strictEqual(relativeUrl(UrlPath("/foo"), UrlPath("/bar")), "./bar");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/baz")), "../baz");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/foo")), "../foo");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/foo.csv")), "../foo.csv");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/foo/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("/foo/bar"), UrlPath("/baz/bar")), "../baz/bar");
    assert.strictEqual(relativeUrl(UrlPath("foo"), UrlPath("bar")), "./bar");
    assert.strictEqual(relativeUrl(UrlPath("foo/bar"), UrlPath("baz")), "../baz");
    assert.strictEqual(relativeUrl(UrlPath("foo/bar"), UrlPath("foo")), "../foo");
    assert.strictEqual(relativeUrl(UrlPath("foo/bar"), UrlPath("foo.csv")), "../foo.csv");
    assert.strictEqual(relativeUrl(UrlPath("foo/bar"), UrlPath("foo/")), "./");
    assert.strictEqual(relativeUrl(UrlPath("foo/bar"), UrlPath("baz/bar")), "../baz/bar");
    assert.strictEqual(relativeUrl(UrlPath("foo////baz"), UrlPath("baz//bar")), "../baz/bar");
  });
});
