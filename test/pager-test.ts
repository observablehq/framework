import assert from "node:assert";
import {UrlPath} from "../src/brandedPath.js";
import {findLink as pager} from "../src/pager.js";

describe("findLink(path, options)", () => {
  it("returns the previous and next links for three pages", () => {
    const config = {
      pages: [
        {name: "a", path: UrlPath("/a")},
        {name: "b", path: UrlPath("/b")},
        {name: "c", path: UrlPath("/c")}
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {
      prev: {name: "Home", path: "/index"},
      next: {name: "b", path: "/b"}
    });
    assert.deepStrictEqual(pager(UrlPath("/b"), config), {
      prev: {name: "a", path: "/a"},
      next: {name: "c", path: "/c"}
    });
    assert.deepStrictEqual(pager(UrlPath("/c"), config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("returns the previous and next links for three pages with sections", () => {
    const config = {
      pages: [
        {
          name: "section",
          open: true,
          pages: [
            {name: "a", path: UrlPath("/a")},
            {name: "b", path: UrlPath("/b")},
            {name: "c", path: UrlPath("/c")}
          ]
        }
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {
      prev: {name: "Home", path: "/index"},
      next: {name: "b", path: "/b"}
    });
    assert.deepStrictEqual(pager(UrlPath("/b"), config), {
      prev: {name: "a", path: "/a"},
      next: {name: "c", path: "/c"}
    });
    assert.deepStrictEqual(pager(UrlPath("/c"), config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("returns the previous and next links for two pages", () => {
    const config = {
      pages: [
        {name: "a", path: UrlPath("/a")},
        {name: "b", path: UrlPath("/b")}
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {
      prev: {name: "Home", path: "/index"},
      next: {name: "b", path: "/b"}
    });
    assert.deepStrictEqual(pager(UrlPath("/b"), config), {prev: {name: "a", path: "/a"}, next: undefined});
  });
  it("returns the previous and next links for one pages", () => {
    const config = {pages: [{name: "a", path: UrlPath("/a")}]};
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {prev: {name: "Home", path: "/index"}, next: undefined});
  });
  it("returns undefined for zero pages", () => {
    const config = {pages: []};
    assert.deepStrictEqual(pager(UrlPath("/index"), config), undefined);
  });
  it("returns undefined for non-referenced pages", () => {
    const config = {
      pages: [
        {name: "a", path: UrlPath("/a")},
        {name: "b", path: UrlPath("/b")},
        {name: "c", path: UrlPath("/c")}
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/d"), config), undefined);
  });
  it("avoids cycles when a path is listed multiple times", () => {
    const config = {
      pages: [
        {name: "a", path: UrlPath("/a")},
        {name: "b", path: UrlPath("/b")},
        {name: "a", path: UrlPath("/a")},
        {name: "c", path: UrlPath("/c")}
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {
      prev: {name: "Home", path: "/index"},
      next: {name: "b", path: "/b"}
    });
    assert.deepStrictEqual(pager(UrlPath("/b"), config), {
      prev: {name: "a", path: "/a"},
      next: {name: "c", path: "/c"}
    });
    assert.deepStrictEqual(pager(UrlPath("/c"), config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("implicitly includes the index page if there is a title", () => {
    const config = {
      title: "Test",
      pages: [
        {name: "a", path: UrlPath("/a")},
        {name: "b", path: UrlPath("/b")},
        {name: "c", path: UrlPath("/c")}
      ]
    };
    assert.deepStrictEqual(pager(UrlPath("/index"), config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager(UrlPath("/a"), config), {
      prev: {name: "Test", path: "/index"},
      next: {name: "b", path: "/b"}
    });
    assert.deepStrictEqual(pager(UrlPath("/b"), config), {
      prev: {name: "a", path: "/a"},
      next: {name: "c", path: "/c"}
    });
    assert.deepStrictEqual(pager(UrlPath("/c"), config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
});
