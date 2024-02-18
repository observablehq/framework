import {resolveNpmImport} from "./javascript/imports.js";
import {type FileReference} from "./javascript.js";

export function getImplicitFileImports(files: Pick<FileReference, "method">[]): Set<string> {
  const imports = new Set<string>();
  for (const file of files) {
    switch (file.method) {
      case "csv":
      case "tsv":
        imports.add("npm:d3-dsv");
        break;
      case "arrow":
        imports.add("npm:apache-arrow");
        break;
      case "parquet":
        imports.add("npm:apache-arrow");
        imports.add("npm:parquet-wasm/esm/arrow1.js");
        break;
      case "sqlite":
        imports.add("npm:@observablehq/sqlite");
        break;
      case "xlsx":
        imports.add("npm:@observablehq/xlsx");
        break;
      case "zip":
        imports.add("npm:@observablehq/zip");
        break;
    }
  }
  return imports;
}

export function getImplicitImports(inputs: Iterable<string>): Set<string> {
  return addImplicitImports(new Set(), inputs);
}

export function addImplicitImports(imports: Set<string>, inputs: Iterable<string>): Set<string> {
  const set = inputs instanceof Set ? inputs : new Set(inputs);
  if (set.has("d3")) imports.add("npm:d3");
  if (set.has("Plot")) imports.add("npm:d3").add("npm:@observablehq/plot");
  if (set.has("htl") || set.has("html") || set.has("svg")) imports.add("npm:htl");
  if (set.has("Inputs")) imports.add("npm:htl").add("npm:isoformat").add("npm:@observablehq/inputs");
  if (set.has("dot")) imports.add("npm:@observablehq/dot").add("npm:@viz-js/viz");
  if (set.has("duckdb")) imports.add("npm:@duckdb/duckdb-wasm");
  if (set.has("DuckDBClient")) imports.add("npm:@observablehq/duckdb").add("npm:@duckdb/duckdb-wasm");
  if (set.has("_")) imports.add("npm:lodash");
  if (set.has("aq")) imports.add("npm:arquero");
  if (set.has("Arrow")) imports.add("npm:apache-arrow");
  if (set.has("L")) imports.add("npm:leaflet");
  if (set.has("mapboxgl")) imports.add("npm:mapbox-gl");
  if (set.has("mermaid")) imports.add("npm:@observablehq/mermaid").add("npm:mermaid").add("npm:d3");
  if (set.has("SQLite") || set.has("SQLiteDatabaseClient")) imports.add("npm:@observablehq/sqlite");
  if (set.has("tex")) imports.add("npm:@observablehq/tex").add("npm:katex");
  if (set.has("topojson")) imports.add("npm:topojson-client");
  if (set.has("vl")) imports.add("npm:vega").add("npm:vega-lite").add("npm:vega-lite-api");
  return imports;
}

export async function getImplicitStylesheets(imports: Set<string>): Promise<Set<string>> {
  return addImplicitStylesheets(new Set(), imports);
}

export async function addImplicitStylesheets(stylesheets: Set<string>, imports: Set<string>): Promise<Set<string>> {
  if (imports.has("npm:@observablehq/inputs")) stylesheets.add("observablehq:stdlib/inputs.css");
  if (imports.has("npm:katex")) stylesheets.add(await resolveNpmImport("katex/dist/katex.min.css"));
  if (imports.has("npm:leaflet")) stylesheets.add(await resolveNpmImport("leaflet/dist/leaflet.css"));
  if (imports.has("npm:mapbox-gl")) stylesheets.add(await resolveNpmImport("mapbox-gl/dist/mapbox-gl.css"));
  return stylesheets;
}
