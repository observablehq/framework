import assert from "node:assert";
import {pager} from "../src/pager.js";

describe.only("pager(path, options)", () => {
  it("returns the previous and next links for three pages", () => {
    const config = {
      pages: [
        {name: "a", path: "/a"},
        {name: "b", path: "/b"},
        {name: "c", path: "/c"}
      ]
    };
    assert.deepStrictEqual(pager("/a", config), {prev: undefined, next: {name: "b", path: "/b"}});
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
    assert.deepStrictEqual(pager("/a", config), {prev: undefined, next: {name: "b", path: "/b"}});
    assert.deepStrictEqual(pager("/b", config), {prev: {name: "a", path: "/a"}, next: undefined});
  });
  it("returns undefined for one page", () => {
    assert.deepStrictEqual(pager("/a", {pages: [{name: "a", path: "/a"}]}), undefined);
  });
  it("returns undefined for zero pages", () => {
    assert.deepStrictEqual(pager("/a", {pages: []}), undefined);
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
