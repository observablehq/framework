import {resolveNpmImport} from "./javascript/imports.js";

export function getImplicitSpecifiers(inputs: Set<string>): Set<string> {
  return addImplicitSpecifiers(new Set(), inputs);
}

export function addImplicitSpecifiers(specifiers: Set<string>, inputs: Set<string>): typeof specifiers {
  if (inputs.has("d3")) specifiers.add("npm:d3");
  if (inputs.has("Plot")) specifiers.add("npm:d3").add("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("html") || inputs.has("svg")) specifiers.add("npm:htl");
  if (inputs.has("Inputs")) specifiers.add("npm:htl").add("npm:isoformat").add("npm:@observablehq/inputs");
  if (inputs.has("dot")) specifiers.add("npm:@observablehq/dot").add("npm:@viz-js/viz");
  if (inputs.has("duckdb")) specifiers.add("npm:@duckdb/duckdb-wasm");
  if (inputs.has("DuckDBClient")) specifiers.add("npm:@observablehq/duckdb").add("npm:@duckdb/duckdb-wasm");
  if (inputs.has("_")) specifiers.add("npm:lodash");
  if (inputs.has("aq")) specifiers.add("npm:arquero");
  if (inputs.has("Arrow")) specifiers.add("npm:apache-arrow");
  if (inputs.has("L")) specifiers.add("npm:leaflet");
  if (inputs.has("mapboxgl")) specifiers.add("npm:mapbox-gl");
  if (inputs.has("mermaid")) specifiers.add("npm:@observablehq/mermaid").add("npm:mermaid").add("npm:d3");
  if (inputs.has("SQLite") || inputs.has("SQLiteDatabaseClient")) specifiers.add("npm:@observablehq/sqlite");
  if (inputs.has("tex")) specifiers.add("npm:@observablehq/tex").add("npm:katex");
  if (inputs.has("topojson")) specifiers.add("npm:topojson-client");
  if (inputs.has("vl")) specifiers.add("npm:vega").add("npm:vega-lite").add("npm:vega-lite-api");
  return specifiers;
}

export async function getImplicitStylesheets(specifiers: Set<string>): Promise<Set<string>> {
  return addImplicitStylesheets(new Set(), specifiers);
}

export async function addImplicitStylesheets(stylesheets: Set<string>, specifiers: Set<string>): Promise<Set<string>> {
  if (specifiers.has("npm:@observablehq/inputs")) stylesheets.add("observablehq:stdlib/inputs.css");
  if (specifiers.has("npm:katex")) stylesheets.add(await resolveNpmImport("katex/dist/katex.min.css"));
  if (specifiers.has("npm:leaflet")) stylesheets.add(await resolveNpmImport("leaflet/dist/leaflet.css"));
  if (specifiers.has("npm:mapbox-gl")) stylesheets.add(await resolveNpmImport("mapbox-gl/dist/mapbox-gl.css"));
  return stylesheets;
}
