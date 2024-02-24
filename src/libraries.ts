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

export function getImplicitStylesheets(imports: Set<string>): Set<string> {
  return addImplicitStylesheets(new Set(), imports);
}

/**
 * These implicit stylesheets are added to the page on render so that the user
 * doesn’t have to remember to add them. This should be kept consistent with
 * addImplicitDownloads below. TODO Do we need to resolve the npm imports here,
 * or could we simply use "npm:" imports for the stylesheet, too? TODO Support
 * versioned imports, too, such as "npm:leaflet@1".
 */
export function addImplicitStylesheets(stylesheets: Set<string>, imports: Set<string>): Set<string> {
  if (imports.has("npm:@observablehq/inputs")) stylesheets.add("observablehq:stdlib/inputs.css");
  if (imports.has("npm:katex")) stylesheets.add("npm:katex/dist/katex.min.css");
  if (imports.has("npm:leaflet")) stylesheets.add("npm:leaflet/dist/leaflet.css");
  if (imports.has("npm:mapbox-gl")) stylesheets.add("npm:mapbox-gl/dist/mapbox-gl.css");
  return stylesheets;
}

/**
 * While transitive imports of JavaScript modules are discovered via parsing,
 * transitive dependencies on other supporting files such as stylesheets and
 * WebAssembly files are often not discoverable statically. Hence, for any
 * recommended library (that is, any library provided by default in Markdown,
 * including with any library used by FileAttachment) we manually enumerate the
 * needed additional downloads here. TODO Support versioned imports, too, such
 * as "npm:leaflet@1".
 */
export function addImplicitDownloads(imports: Set<string>): Set<string> {
  if (imports.has("npm:@observablehq/duckdb")) {
    imports.add("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm");
    imports.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js");
    imports.add("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm");
    imports.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js");
  }
  if (imports.has("npm:@observablehq/sqlite")) {
    imports.add("npm:sql.js/dist/sql-wasm.js");
    imports.add("npm:sql.js/dist/sql-wasm.wasm");
  }
  if (imports.has("npm:leaflet")) {
    imports.add("npm:leaflet/dist/leaflet.css");
  }
  if (imports.has("npm:katex")) {
    imports.add("npm:katex/dist/katex.min.css");
  }
  if (imports.has("npm:mapbox-gl")) {
    imports.add("npm:mapbox-gl/dist/mapbox-gl.css");
  }
  return imports;
}
