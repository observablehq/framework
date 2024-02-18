import assert from "node:assert";
import {getImplicitFileImports} from "../src/libraries.js";

describe("getImplicitFileImports(files)", () => {
  it("supports csv", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "csv"}]), new Set(["npm:d3-dsv"]));
  });
  it("supports tsv", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "tsv"}]), new Set(["npm:d3-dsv"]));
  });
  it("supports arrow", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "arrow"}]), new Set(["npm:apache-arrow"]));
  });
  it("supports parquet", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "parquet"}]), new Set(["npm:apache-arrow", "npm:parquet-wasm/esm/arrow1.js"])); // prettier-ignore
  });
  it("supports sqlite", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "sqlite"}]), new Set(["npm:@observablehq/sqlite"]));
  });
  it("supports xlsx", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "xlsx"}]), new Set(["npm:@observablehq/xlsx"]));
  });
  it("supports zip", () => {
    assert.deepStrictEqual(getImplicitFileImports([{method: "zip"}]), new Set(["npm:@observablehq/zip"]));
  });
});
