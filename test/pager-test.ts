import assert from "node:assert";
import {normalizeConfig} from "../src/config.js";
import {findLink as pager} from "../src/pager.js";

describe("findLink(path, options)", () => {
  it("returns the previous and next links for three pages", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const c = {name: "c", path: "/c", pager: "main"};
    const config = {pages: [a, b, c]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index", pager: "main"}, next: b});
    assert.deepStrictEqual(pager("/b", config), {prev: a, next: c});
    assert.deepStrictEqual(pager("/c", config), {prev: b, next: undefined});
  });
  it("returns the previous and next links for three pages with sections", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const c = {name: "c", path: "/c", pager: "main"};
    const config = {pages: [{name: "section", collapsible: true, open: true, pages: [a, b, c]}]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index", pager: "main"}, next: b});
    assert.deepStrictEqual(pager("/b", config), {prev: a, next: c});
    assert.deepStrictEqual(pager("/c", config), {prev: b, next: undefined});
  });
  it("returns the previous and next links for two pages", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const config = {pages: [a, b]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index", pager: "main"}, next: b});
    assert.deepStrictEqual(pager("/b", config), {prev: a, next: undefined});
  });
  it("returns the previous and next links for one pages", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const config = {pages: [a]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index", pager: "main"}, next: undefined});
  });
  it("returns undefined for zero pages", () => {
    const config = {pages: []};
    assert.deepStrictEqual(pager("/index", config), undefined);
  });
  it("returns undefined for non-referenced pages", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const c = {name: "c", path: "/c", pager: "main"};
    const config = {pages: [a, b, c]};
    assert.deepStrictEqual(pager("/d", config), undefined);
  });
  it("avoids cycles when a path is listed multiple times", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const c = {name: "c", path: "/c", pager: "main"};
    const config = {pages: [a, b, a, c]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Home", path: "/index", pager: "main"}, next: b});
    assert.deepStrictEqual(pager("/b", config), {prev: a, next: c});
    assert.deepStrictEqual(pager("/c", config), {prev: b, next: undefined});
  });
  it("implicitly includes the index page if there is a title", () => {
    const a = {name: "a", path: "/a", pager: "main"};
    const b = {name: "b", path: "/b", pager: "main"};
    const c = {name: "c", path: "/c", pager: "main"};
    const config = {title: "Test", pages: [a, b, c]};
    assert.deepStrictEqual(pager("/index", config), {prev: undefined, next: a});
    assert.deepStrictEqual(pager("/a", config), {prev: {name: "Test", path: "/index", pager: "main"}, next: b});
    assert.deepStrictEqual(pager("/b", config), {prev: a, next: c});
    assert.deepStrictEqual(pager("/c", config), {prev: b, next: undefined});
  });
  it("normalizes / to /index", async () => {
    const config = normalizeConfig({pages: [{name: "Home", path: "/", pager: "main"}]});
    assert.strictEqual(pager("/index", config), undefined);
    assert.strictEqual(pager("/", config), undefined);
  });
  it("normalizes / to /index (2)", async () => {
    const config = normalizeConfig({
      pages: [
        {name: "Home", path: "/"},
        {name: "Second Home", path: "/second"}
      ]
    });
    assert.deepStrictEqual(pager("/second", config), {
      next: undefined,
      prev: {name: "Home", path: "/index", pager: "main"}
    });
    assert.deepStrictEqual(pager("/index", config), {
      next: {name: "Second Home", path: "/second", pager: "main"},
      prev: undefined
    });
    assert.strictEqual(pager("/", config), undefined);
  });
  it("normalizes / to /index (3)", async () => {
    const config = normalizeConfig({
      pages: [
        {name: "Home", path: "/"},
        {name: "Second Home", path: "/second"},
        {name: "By The Sea", path: "/by-the-sea"}
      ]
    });
    assert.deepStrictEqual(pager("/second", config), {
      next: {name: "By The Sea", path: "/by-the-sea", pager: "main"},
      prev: {name: "Home", path: "/index", pager: "main"}
    });
    assert.deepStrictEqual(pager("/index", config), {
      next: {name: "Second Home", path: "/second", pager: "main"},
      prev: undefined
    });
    assert.strictEqual(pager("/", config), undefined);
  });
});
