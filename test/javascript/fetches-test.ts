import assert from "node:assert";
import {ascending} from "d3-array";
import {parseLocalImports} from "../../src/javascript/imports.js";
import {type Feature} from "../../src/javascript.js";

describe("parseLocalFetches(root, paths)", () => {
  it("find all local fetches in one file", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["foo/foo.js"]).fetches.sort(compareImport), [
      {name: "./foo-data.csv", type: "FileAttachment"},
      {name: "./foo-data.json", type: "FileAttachment"}
    ]);
  });
  it("find all local fetches in through transivite import", () => {
    assert.deepStrictEqual(parseLocalImports("test/input/build/fetches", ["top.js"]).fetches.sort(compareImport), [
      {name: "./foo-data.csv", type: "FileAttachment"},
      {name: "./foo-data.json", type: "FileAttachment"},
      {name: "./top-data.csv", type: "FileAttachment"},
      {name: "./top-data.json", type: "FileAttachment"}
    ]);
  });
});

function compareImport(a: Feature, b: Feature): number {
  return ascending(a.type, b.type) || ascending(a.name, b.name);
}
