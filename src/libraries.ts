import type {DuckDBConfig} from "./config.js";
import {resolveDuckDBExtension} from "./duckdb.js";

export function getImplicitFileImports(methods: Iterable<string>): Set<string> {
  const set = setof(methods);
  const implicits = new Set<string>();
  if (set.has("arrow")) implicits.add("npm:apache-arrow");
  if (set.has("arquero")) implicits.add("npm:apache-arrow").add("npm:arquero");
  if (set.has("arquero-parquet")) implicits.add("npm:apache-arrow").add("npm:arquero").add("npm:parquet-wasm");
  if (set.has("csv") || set.has("tsv")) implicits.add("npm:d3-dsv");
  if (set.has("parquet")) implicits.add("npm:apache-arrow").add("npm:parquet-wasm");
  if (set.has("sqlite")) implicits.add("npm:@observablehq/sqlite");
  if (set.has("xlsx")) implicits.add("observablehq:stdlib/xlsx");
  if (set.has("zip")) implicits.add("observablehq:stdlib/zip");
  return implicits;
}

export function getImplicitInputImports(inputs: Iterable<string>): Set<string> {
  const set = setof(inputs);
  const implicits = new Set<string>();
  if (set.has("_")) implicits.add("npm:lodash");
  if (set.has("aq")) implicits.add("npm:arquero");
  if (set.has("Arrow")) implicits.add("npm:apache-arrow");
  if (set.has("d3")) implicits.add("npm:d3");
  if (set.has("dot")) implicits.add("npm:@observablehq/dot");
  if (set.has("duckdb")) implicits.add("npm:@duckdb/duckdb-wasm");
  if (set.has("DuckDBClient") || set.has("sql")) implicits.add("npm:@observablehq/duckdb");
  if (set.has("echarts")) implicits.add("npm:echarts");
  if (set.has("htl") || set.has("html") || set.has("svg")) implicits.add("npm:htl");
  if (set.has("Inputs")) implicits.add("npm:@observablehq/inputs");
  if (set.has("L")) implicits.add("npm:leaflet");
  if (set.has("mapboxgl")) implicits.add("npm:mapbox-gl");
  if (set.has("mermaid")) implicits.add("npm:@observablehq/mermaid");
  if (set.has("Plot")) implicits.add("npm:@observablehq/plot");
  if (set.has("SQLite") || set.has("SQLiteDatabaseClient")) implicits.add("npm:@observablehq/sqlite");
  if (set.has("tex")) implicits.add("npm:@observablehq/tex");
  if (set.has("topojson")) implicits.add("npm:topojson-client");
  if (set.has("vl")) implicits.add("observablehq:stdlib/vega-lite");
  if (set.has("vg")) implicits.add("observablehq:stdlib/vgplot");
  if (set.has("aapl")) implicits.add("npm:@observablehq/sample-datasets/aapl.csv");
  if (set.has("alphabet")) implicits.add("npm:@observablehq/sample-datasets/alphabet.csv");
  if (set.has("cars")) implicits.add("npm:@observablehq/sample-datasets/cars.csv");
  if (set.has("citywages")) implicits.add("npm:@observablehq/sample-datasets/citywages.csv");
  if (set.has("diamonds")) implicits.add("npm:@observablehq/sample-datasets/diamonds.csv");
  if (set.has("flare")) implicits.add("npm:@observablehq/sample-datasets/flare.csv");
  if (set.has("industries")) implicits.add("npm:@observablehq/sample-datasets/industries.csv");
  if (set.has("miserables")) implicits.add("npm:@observablehq/sample-datasets/miserables.json");
  if (set.has("olympians")) implicits.add("npm:@observablehq/sample-datasets/olympians.csv");
  if (set.has("penguins")) implicits.add("npm:@observablehq/sample-datasets/penguins.csv");
  if (set.has("pizza")) implicits.add("npm:@observablehq/sample-datasets/pizza.csv");
  if (set.has("weather")) implicits.add("npm:@observablehq/sample-datasets/weather.csv");
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
export function getImplicitDownloads(imports: Iterable<string>, duckdb?: DuckDBConfig): Set<string> {
  const set = setof(imports);
  const implicits = new Set<string>();
  if (set.has("npm:@observablehq/duckdb")) {
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm");
    implicits.add("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js");
    if (!duckdb) throw new Error("Implementation error: missing duckdb configuration");
    for (const [name, {source}] of Object.entries(duckdb.extensions)) {
      for (const platform in duckdb.platforms) {
        implicits.add(`duckdb:${resolveDuckDBExtension(source, platform, name)}`);
      }
    }
  }
  if (set.has("npm:@observablehq/sqlite")) {
    implicits.add("npm:sql.js/dist/sql-wasm.js");
    implicits.add("npm:sql.js/dist/sql-wasm.wasm");
  }
  if (set.has("npm:leaflet")) {
    implicits.add("npm:leaflet/dist/images/layers.png");
    implicits.add("npm:leaflet/dist/images/layers-2x.png");
    implicits.add("npm:leaflet/dist/images/marker-icon.png");
    implicits.add("npm:leaflet/dist/images/marker-icon-2x.png");
    implicits.add("npm:leaflet/dist/images/marker-shadow.png");
  }
  if (set.has("npm:katex")) {
    implicits.add("npm:katex/dist/fonts/KaTeX_AMS-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_AMS-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_AMS-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Bold.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Bold.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Bold.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Bold.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Bold.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Fraktur-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Bold.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Bold.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Bold.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-BoldItalic.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-BoldItalic.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-BoldItalic.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Italic.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Italic.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Italic.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Main-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-BoldItalic.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-BoldItalic.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-BoldItalic.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-Italic.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-Italic.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Math-Italic.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Bold.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Bold.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Bold.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Italic.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Italic.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Italic.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_SansSerif-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Script-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Script-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Script-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size1-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size1-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size1-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size2-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size2-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size2-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size3-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size3-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size3-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size4-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size4-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Size4-Regular.woff2");
    implicits.add("npm:katex/dist/fonts/KaTeX_Typewriter-Regular.ttf");
    implicits.add("npm:katex/dist/fonts/KaTeX_Typewriter-Regular.woff");
    implicits.add("npm:katex/dist/fonts/KaTeX_Typewriter-Regular.woff2");
  }
  if (set.has("npm:parquet-wasm")) {
    implicits.add("npm:parquet-wasm/esm/parquet_wasm_bg.wasm");
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
  if (set.has("observablehq:stdlib/xlsx")) implicits.add("npm:exceljs");
  if (set.has("observablehq:stdlib/zip")) implicits.add("npm:jszip");
  if (set.has("observablehq:stdlib/vega-lite")) implicits.add("npm:vega-lite-api").add("npm:vega-lite").add("npm:vega");
  if (set.has("observablehq:stdlib/vgplot")) implicits.add("npm:@uwdata/vgplot").add("npm:@observablehq/duckdb").add("npm:@duckdb/duckdb-wasm"); // prettier-ignore
  return implicits;
}

function setof<T>(iterable: Iterable<T>): Set<T> {
  return iterable instanceof Set ? iterable : new Set(iterable);
}
