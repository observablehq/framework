import assert from "node:assert";
import {ascending} from "d3-array";
import {parseLocalImports} from "../../src/javascript/imports.js";
import {type ImportReference} from "../../src/javascript.js";

describe("parseLocalImports(root, paths)", () => {
  it("finds all local imports in one file", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/imports", ["foo/foo.js"]).sort(compareImport), [
      {name: "npm:d3", type: "global"},
      {name: "bar/bar.js", type: "local"},
      {name: "bar/baz.js", type: "local"},
      {name: "foo/foo.js", type: "local"},
      {name: "top.js", type: "local"}
    ]);
  });
  it("finds all local imports in multiple files", () => {
    assert.deepStrictEqual(
      parseLocalImports("test/input/imports", ["transitive-static-import.js", "dynamic-import.js"]).sort(compareImport),
      [
        {name: "bar.js", type: "local"},
        {name: "dynamic-import.js", type: "local"},
        {name: "other/foo.js", type: "local"},
        {name: "transitive-static-import.js", type: "local"}
      ]
    );
  });
  it("ignores missing files", () => {
    assert.deepStrictEqual(
      parseLocalImports("test/input/imports", ["static-import.js", "does-not-exist.js"]).sort(compareImport),
      [
        {name: "bar.js", type: "local"},
        {name: "does-not-exist.js", type: "local"},
        {name: "static-import.js", type: "local"}
      ]
    );
  });
});

function compareImport(a: ImportReference, b: ImportReference): number {
  return ascending(a.type, b.type) || ascending(a.name, b.name);
}
