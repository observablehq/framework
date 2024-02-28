export function getImplicitFileImports(methods: Iterable<string>): Set<string> {
  const set = setof(methods);
  const implicits = new Set<string>();
  if (set.has("csv") || set.has("tsv")) implicits.add("npm:d3-dsv");
  if (set.has("arrow")) implicits.add("npm:apache-arrow");
  if (set.has("parquet")) implicits.add("npm:apache-arrow").add("npm:parquet-wasm/esm/arrow1.js");
  if (set.has("sqlite")) implicits.add("npm:@observablehq/sqlite");
  if (set.has("xlsx")) implicits.add("npm:@observablehq/xlsx");
  if (set.has("zip")) implicits.add("npm:@observablehq/zip");
  return implicits;
}

export function getImplicitInputImports(inputs: Iterable<string>): Set<string> {
  const set = setof(inputs);
  const implicits = new Set<string>();
  if (set.has("d3")) implicits.add("npm:d3");
  if (set.has("Plot")) implicits.add("npm:@observablehq/plot");
  if (set.has("htl") || set.has("html") || set.has("svg")) implicits.add("npm:htl");
  if (set.has("Inputs")) implicits.add("npm:@observablehq/inputs");
  if (set.has("dot")) implicits.add("npm:@observablehq/dot");
  if (set.has("duckdb")) implicits.add("npm:@duckdb/duckdb-wasm");
  if (set.has("DuckDBClient")) implicits.add("npm:@observablehq/duckdb");
  if (set.has("_")) implicits.add("npm:lodash");
  if (set.has("aq")) implicits.add("npm:arquero");
  if (set.has("Arrow")) implicits.add("npm:apache-arrow");
  if (set.has("L")) implicits.add("npm:leaflet");
  if (set.has("mapboxgl")) implicits.add("npm:mapbox-gl");
  if (set.has("mermaid")) implicits.add("npm:@observablehq/mermaid");
  if (set.has("SQLite") || set.has("SQLiteDatabaseClient")) implicits.add("npm:@observablehq/sqlite");
  if (set.has("tex")) implicits.add("npm:@observablehq/tex");
  if (set.has("topojson")) implicits.add("npm:topojson-client");
  if (set.has("vl")) implicits.add("npm:vega-lite-api").add("npm:vega-lite").add("npm:vega");
  return implicits;
}

/**
 * These implicit stylesheets are added to the page on render so that the user
 * doesn’t have to remember to add them. TODO Support versioned imports, too,
 * such as "npm:leaflet@1".
 */
export function getImplicitStylesheets(imports: Iterable<string>): Set<string> {
  const set = setof(imports);
  const implicits = new Set<string>();
  if (set.has("npm:@observablehq/inputs")) implicits.add("observablehq:stdlib/inputs.css");
  if (set.has("npm:katex")) implicits.add("npm:katex/dist/katex.min.css");
  if (set.has("npm:leaflet")) implicits.add("npm:leaflet/dist/leaflet.css");
  if (set.has("npm:mapbox-gl")) implicits.add("npm:mapbox-gl/dist/mapbox-gl.css");
  return implicits;
}

/**
 * While transitive imports of JavaScript modules are discovered via parsing,
 * transitive dependencies on other supporting assets such as WebAssembly files
 * are often not discoverable statically. Hence, for any recommended library
 * (that is, any library provided by default in Markdown, including with any
 * library used by FileAttachment) we manually enumerate the needed additional
 * downloads here. TODO Support versioned imports, too, such as "npm:leaflet@1".
 */
export function getImplicitFiles(imports: Iterable<string>): Set<string> {
  const set = setof(imports);
  const implicits = new Set<string>();
  if (set.has("npm:@observablehq/duckdb")) {
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js");
  }
  if (set.has("npm:@observablehq/sqlite")) {
    implicits.add("npm:sql.js/dist/sql-wasm.js");
    implicits.add("npm:sql.js/dist/sql-wasm.wasm");
  }
  return implicits;
}

export function getImplicitDependencies(imports: Iterable<string>): Set<string> {
  const set = setof(imports);
  const implicits = new Set<string>();
  if (set.has("npm:@observablehq/dot")) implicits.add("npm:@viz-js/viz");
  if (set.has("npm:@observablehq/duckdb")) implicits.add("npm:@duckdb/duckdb-wasm");
  if (set.has("npm:@observablehq/inputs")) implicits.add("npm:htl").add("npm:isoformat");
  if (set.has("npm:@observablehq/mermaid")) implicits.add("npm:mermaid");
  if (set.has("npm:@observablehq/tex")) implicits.add("npm:katex");
  if (set.has("npm:@observablehq/xlsx")) implicits.add("npm:exceljs");
  if (set.has("npm:@observablehq/zip")) implicits.add("npm:jszip");
  return implicits;
}

function setof<T>(iterable: Iterable<T>): Set<T> {
  return iterable instanceof Set ? iterable : new Set(iterable);
}
