import assert from "node:assert";
import {getImplicitDependencies, getImplicitDownloads, getImplicitStylesheets} from "../src/libraries.js";
import {getImplicitFileImports, getImplicitInputImports} from "../src/libraries.js";

describe("getImplicitFileImports(files)", () => {
  it("supports known file methods", () => {
    assert.deepStrictEqual(getImplicitFileImports(["csv"]), new Set(["npm:d3-dsv"]));
    assert.deepStrictEqual(getImplicitFileImports(["tsv"]), new Set(["npm:d3-dsv"]));
    assert.deepStrictEqual(getImplicitFileImports(["arrow"]), new Set(["npm:apache-arrow"]));
    assert.deepStrictEqual(getImplicitFileImports(["parquet"]), new Set(["npm:apache-arrow", "npm:parquet-wasm/esm/arrow1.js"])); // prettier-ignore
    assert.deepStrictEqual(getImplicitFileImports(["sqlite"]), new Set(["npm:@observablehq/sqlite"]));
    assert.deepStrictEqual(getImplicitFileImports(["xlsx"]), new Set(["npm:@observablehq/xlsx"]));
    assert.deepStrictEqual(getImplicitFileImports(["zip"]), new Set(["npm:@observablehq/zip"]));
  });
});

describe("getImplicitInputImports(inputs)", () => {
  it("supports known inputs", () => {
    assert.deepStrictEqual(getImplicitInputImports(["d3"]), new Set(["npm:d3"]));
    assert.deepStrictEqual(getImplicitInputImports(["Plot"]), new Set(["npm:@observablehq/plot"]));
    assert.deepStrictEqual(getImplicitInputImports(["htl"]), new Set(["npm:htl"]));
    assert.deepStrictEqual(getImplicitInputImports(["html"]), new Set(["npm:htl"]));
    assert.deepStrictEqual(getImplicitInputImports(["svg"]), new Set(["npm:htl"]));
    assert.deepStrictEqual(getImplicitInputImports(["Inputs"]), new Set(["npm:@observablehq/inputs"]));
    assert.deepStrictEqual(getImplicitInputImports(["dot"]), new Set(["npm:@observablehq/dot"]));
    assert.deepStrictEqual(getImplicitInputImports(["duckdb"]), new Set(["npm:@duckdb/duckdb-wasm"]));
    assert.deepStrictEqual(getImplicitInputImports(["DuckDBClient"]), new Set(["npm:@observablehq/duckdb"]));
    assert.deepStrictEqual(getImplicitInputImports(["_"]), new Set(["npm:lodash"]));
    assert.deepStrictEqual(getImplicitInputImports(["aq"]), new Set(["npm:arquero"]));
    assert.deepStrictEqual(getImplicitInputImports(["Arrow"]), new Set(["npm:apache-arrow"]));
    assert.deepStrictEqual(getImplicitInputImports(["L"]), new Set(["npm:leaflet"]));
    assert.deepStrictEqual(getImplicitInputImports(["mapboxgl"]), new Set(["npm:mapbox-gl"]));
    assert.deepStrictEqual(getImplicitInputImports(["mermaid"]), new Set(["npm:@observablehq/mermaid"]));
    assert.deepStrictEqual(getImplicitInputImports(["SQLite"]), new Set(["npm:@observablehq/sqlite"]));
    assert.deepStrictEqual(getImplicitInputImports(["SQLiteDatabaseClient"]), new Set(["npm:@observablehq/sqlite"]));
    assert.deepStrictEqual(getImplicitInputImports(["tex"]), new Set(["npm:@observablehq/tex"]));
    assert.deepStrictEqual(getImplicitInputImports(["topojson"]), new Set(["npm:topojson-client"]));
    assert.deepStrictEqual(getImplicitInputImports(["vl"]), new Set(["observablehq:stdlib/vega-lite"]));
  });
});

describe("getImplicitStylesheets(imports)", () => {
  it("supports known imports", () => {
    assert.deepStrictEqual(getImplicitStylesheets(["npm:@observablehq/inputs"]), new Set(["observablehq:stdlib/inputs.css"])); // prettier-ignore
    assert.deepStrictEqual(getImplicitStylesheets(["npm:katex"]), new Set(["npm:katex/dist/katex.min.css"])); // prettier-ignore
    assert.deepStrictEqual(getImplicitStylesheets(["npm:leaflet"]), new Set(["npm:leaflet/dist/leaflet.css"])); // prettier-ignore
    assert.deepStrictEqual(getImplicitStylesheets(["npm:mapbox-gl"]), new Set(["npm:mapbox-gl/dist/mapbox-gl.css"])); // prettier-ignore
  });
});

describe("getImplicitDownloads(imports)", () => {
  it("supports known imports", () => {
    assert.deepStrictEqual(
      getImplicitDownloads(["npm:@observablehq/duckdb"]),
      new Set([
        "npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm",
        "npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js",
        "npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
        "npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js"
      ])
    );
    assert.deepStrictEqual(
      getImplicitDownloads(["npm:@observablehq/sqlite"]),
      new Set(["npm:sql.js/dist/sql-wasm.js", "npm:sql.js/dist/sql-wasm.wasm"])
    );
  });
});

describe("getImplicitDependencies(imports)", () => {
  it("supports known imports", () => {
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/dot"]), new Set(["npm:@viz-js/viz"]));
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/duckdb"]), new Set(["npm:@duckdb/duckdb-wasm"]));
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/inputs"]), new Set(["npm:htl", "npm:isoformat"])); // prettier-ignore
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/mermaid"]), new Set(["npm:mermaid"]));
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/tex"]), new Set(["npm:katex"]));
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/xlsx"]), new Set(["npm:exceljs"]));
    assert.deepStrictEqual(getImplicitDependencies(["npm:@observablehq/zip"]), new Set(["npm:jszip"]));
    assert.deepStrictEqual(getImplicitDependencies(["observablehq:stdlib/vega-lite"]), new Set(["npm:vega-lite-api", "npm:vega-lite", "npm:vega"])); // prettier-ignore
  });
});
