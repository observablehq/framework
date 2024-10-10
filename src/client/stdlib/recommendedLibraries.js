export const _ = () => import("npm:lodash").then((lodash) => lodash.default);
export const aq = () => import("npm:arquero");
export const Arrow = () => import("npm:apache-arrow");
export const d3 = () => import("npm:d3");
export const dot = () => import("observablehq:stdlib/dot").then((dot) => dot.default);
export const duckdb = () => import("npm:@duckdb/duckdb-wasm");
export const DuckDBClient = () => import("observablehq:stdlib/duckdb").then((duckdb) => duckdb.DuckDBClient);
export const echarts = () => import("npm:echarts");
export const htl = () => import("npm:htl");
export const html = () => import("npm:htl").then((htl) => htl.html);
export const svg = () => import("npm:htl").then((htl) => htl.svg);
export const Inputs = () => import("npm:@observablehq/inputs");
export const L = () => import("npm:leaflet");
export const mapboxgl = () => import("npm:mapbox-gl").then((module) => module.default);
export const mermaid = () => import("observablehq:stdlib/mermaid").then((mermaid) => mermaid.default);
export const Plot = () => import("npm:@observablehq/plot");
export const React = () => import("npm:react");
export const ReactDOM = () => import("npm:react-dom");
export const sql = () =>
  import("observablehq:stdlib/duckdb").then(async (duckdb) => {
    const {sql} = duckdb;
    const extensions = JSON.parse(document.querySelector("#observablehq-duckdb-hosted-extensions").textContent);
    for (const [name, {ref, load}] of extensions) {
      const x = `INSTALL ${name} FROM '${new URL(`../${ref}`, import.meta.url).href}';`;
      console.warn(import.meta.url, x);
      await sql([x]);
      if (load) {
        const y = `LOAD ${name};`;
        console.warn(import.meta.url, y);
        await sql([y]);
      }
    }
    console.warn(extensions);
    return sql;
  });
export const SQLite = () => import("observablehq:stdlib/sqlite").then((sqlite) => sqlite.default);
export const SQLiteDatabaseClient = () => import("observablehq:stdlib/sqlite").then((sqlite) => sqlite.SQLiteDatabaseClient); // prettier-ignore
export const tex = () => import("observablehq:stdlib/tex").then((tex) => tex.default);
export const topojson = () => import("npm:topojson-client");
export const vg = () => import("observablehq:stdlib/vgplot").then((vg) => vg.default());
export const vl = () => import("observablehq:stdlib/vega-lite").then((vl) => vl.default);
