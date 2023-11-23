import assert from "node:assert";
import {pager} from "../src/pager.js";

describe("pager(path, options)", () => {
  it("returns the previous and next links for three pages", () => {
    const config = {
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"},
        {name: "c", path: "/c"}
      ]
    };
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index"}, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: {name: "c", path: "/c"}});
    assert.deepStrictEqual(pager("/c", config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("returns the previous and next links for three pages with sections", () => {
    const config = {
      pages: [
        {
          name: "section",
          open: true,
          pages: [
            {name: "a", path: "/a"},
            {name: "b", path: "/b"},
            {name: "c", path: "/c"}
          ]
        }
      ]
    };
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index"}, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: {name: "c", path: "/c"}});
    assert.deepStrictEqual(pager("/c", config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("returns the previous and next links for two pages", () => {
    const config = {
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"}
      ]
    };
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index"}, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: undefined});
  });
  it("returns the previous and next links for one pages", () => {
    const config = {pages: [{name: "a", path: "/a"}]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index"}, next: undefined});
  });
  it("returns undefined for zero pages", () => {
    const config = {pages: []};
    assert.deepStrictEqual(pager("/index", config), undefined);
  });
  it("returns undefined for non-referenced pages", () => {
    const config = {
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"},
        {name: "c", path: "/c"}
      ]
    };
    assert.deepStrictEqual(pager("/d", config), undefined);
  });
  it("avoids cycles when a path is listed multiple times", () => {
    const config = {
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"},
        {name: "a", path: "/a"},
        {name: "c", path: "/c"}
      ]
    };
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index"}, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: {name: "c", path: "/c"}});
    assert.deepStrictEqual(pager("/c", config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
  it("implicitly includes the index page if there is a title", () => {
    const config = {
      title: "Test",
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"},
        {name: "c", path: "/c"}
      ]
    };
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: {name: "a", path: "/a"}});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Test", path: "/index"}, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: {name: "c", path: "/c"}});
    assert.deepStrictEqual(pager("/c", config), {prev: {name: "b", path: "/b"}, next: undefined});
  });
});
