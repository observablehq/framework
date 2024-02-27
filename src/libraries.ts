export function getImplicitFileImports(methods: Iterable<string>): Set<string> {
  return addImplicitFileImports(new Set<string>(), methods);
}

export function addImplicitFileImports(imports: Set<string>, methods: Iterable<string>): Set<string> {
  for (const method of methods) {
    switch (method) {
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

export function getImplicitInputImports(inputs: Iterable<string>): Set<string> {
  return addImplicitInputImports(new Set(), inputs);
}

export function addImplicitInputImports(imports: Set<string>, inputs: Iterable<string>): Set<string> {
  const set = inputs instanceof Set ? inputs : new Set(inputs);
  if (set.has("d3")) imports.add("npm:d3");
  if (set.has("Plot")) imports.add("npm:@observablehq/plot");
  if (set.has("htl") || set.has("html") || set.has("svg")) imports.add("npm:htl");
  if (set.has("Inputs")) imports.add("npm:@observablehq/inputs");
  if (set.has("dot")) imports.add("npm:@observablehq/dot");
  if (set.has("duckdb")) imports.add("npm:@duckdb/duckdb-wasm");
  if (set.has("DuckDBClient")) imports.add("npm:@observablehq/duckdb");
  if (set.has("_")) imports.add("npm:lodash");
  if (set.has("aq")) imports.add("npm:arquero");
  if (set.has("Arrow")) imports.add("npm:apache-arrow");
  if (set.has("L")) imports.add("npm:leaflet");
  if (set.has("mapboxgl")) imports.add("npm:mapbox-gl");
  if (set.has("mermaid")) imports.add("npm:@observablehq/mermaid");
  if (set.has("SQLite") || set.has("SQLiteDatabaseClient")) imports.add("npm:@observablehq/sqlite");
  if (set.has("tex")) imports.add("npm:@observablehq/tex");
  if (set.has("topojson")) imports.add("npm:topojson-client");
  if (set.has("vl")) imports.add("npm:vega-lite-api").add("npm:vega-lite").add("npm:vega");
  return imports;
}

export function getImplicitStylesheets(imports: Set<string>): Set<string> {
  return addImplicitStylesheets(new Set(), imports);
}

/**
 * These implicit stylesheets are added to the page on render so that the user
 * doesn’t have to remember to add them. TODO Support versioned imports, too,
 * such as "npm:leaflet@1".
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
 * transitive dependencies on other supporting assets such as WebAssembly files
 * are often not discoverable statically. Hence, for any recommended library
 * (that is, any library provided by default in Markdown, including with any
 * library used by FileAttachment) we manually enumerate the needed additional
 * downloads here. TODO Support versioned imports, too, such as "npm:leaflet@1".
 */
export function addImplicitFiles(files: Set<string>, imports: Set<string>): Set<string> {
  if (imports.has("npm:@observablehq/duckdb")) {
    files.add("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm");
    files.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js");
    files.add("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm");
    files.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js");
  }
  if (imports.has("npm:@observablehq/sqlite")) {
    files.add("npm:sql.js/dist/sql-wasm.js");
    files.add("npm:sql.js/dist/sql-wasm.wasm");
  }
  return files;
}
