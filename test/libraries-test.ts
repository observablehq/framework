import assert from "node:assert";
import {getImplicitFileImports} from "../src/libraries.js";

describe("getImplicitFileImports(files)", () => {
  it("supports csv", () => {
    assert.deepStrictEqual(getImplicitFileImports(["csv"]), new Set(["npm:d3-dsv"]));
  });
  it("supports tsv", () => {
    assert.deepStrictEqual(getImplicitFileImports(["tsv"]), new Set(["npm:d3-dsv"]));
  });
  it("supports arrow", () => {
    assert.deepStrictEqual(getImplicitFileImports(["arrow"]), new Set(["npm:apache-arrow"]));
  });
  it("supports parquet", () => {
    assert.deepStrictEqual(getImplicitFileImports(["parquet"]), new Set(["npm:apache-arrow", "npm:parquet-wasm/esm/arrow1.js"])); // prettier-ignore
  });
  it("supports sqlite", () => {
    assert.deepStrictEqual(getImplicitFileImports(["sqlite"]), new Set(["npm:@observablehq/sqlite"]));
  });
  it("supports xlsx", () => {
    assert.deepStrictEqual(getImplicitFileImports(["xlsx"]), new Set(["npm:@observablehq/xlsx"]));
  });
  it("supports zip", () => {
    assert.deepStrictEqual(getImplicitFileImports(["zip"]), new Set(["npm:@observablehq/zip"]));
  });
});
