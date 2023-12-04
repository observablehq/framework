export function getImplicitSpecifiers(inputs: Set<string>): Set<string> {
  return addImplicitSpecifiers(new Set(), inputs);
}

export function addImplicitSpecifiers(specifiers: Set<string>, inputs: Set<string>): typeof specifiers {
  if (inputs.has("d3")) specifiers.add("npm:d3");
  if (inputs.has("Plot")) specifiers.add("npm:d3").add("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("html") || inputs.has("svg")) specifiers.add("npm:htl");
  if (inputs.has("Inputs")) specifiers.add("npm:htl").add("npm:@observablehq/inputs");
  if (inputs.has("dot")) specifiers.add("npm:@observablehq/dot").add("npm:@viz-js/viz");
  if (inputs.has("duckdb")) specifiers.add("npm:@duckdb/duckdb-wasm");
  if (inputs.has("DuckDBClient")) specifiers.add("npm:@observablehq/duckdb").add("npm:@duckdb/duckdb-wasm");
  if (inputs.has("_")) specifiers.add("npm:lodash");
  if (inputs.has("aq")) specifiers.add("npm:arquero");
  if (inputs.has("Arrow")) specifiers.add("npm:apache-arrow");
  if (inputs.has("L")) specifiers.add("npm:leaflet");
  if (inputs.has("mermaid")) specifiers.add("npm:@observablehq/mermaid").add("npm:mermaid").add("npm:d3");
  if (inputs.has("SQLite") || inputs.has("SQLiteDatabaseClient")) specifiers.add("npm:@observablehq/sqlite");
  if (inputs.has("tex")) specifiers.add("npm:@observablehq/tex").add("npm:katex");
  if (inputs.has("topojson")) specifiers.add("npm:topojson-client");
  return specifiers;
}

export function getImplicitStylesheets(specifiers: Set<string>): Set<string> {
  return addImplicitStylesheets(new Set(), specifiers);
}

export function addImplicitStylesheets(stylesheets: Set<string>, specifiers: Set<string>): typeof stylesheets {
  if (specifiers.has("npm:katex")) stylesheets.add("https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css");
  if (specifiers.has("npm:@observablehq/inputs")) stylesheets.add("https://cdn.jsdelivr.net/gh/observablehq/inputs/src/style.css"); // prettier-ignore
  if (specifiers.has("npm:leaflet")) stylesheets.add("https://cdn.jsdelivr.net/npm/leaflet/dist/leaflet.css");
  return stylesheets;
}
