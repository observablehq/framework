import {getCurrentAgent, mockAgent} from "./undici.js";

const packages: [name: string, version: string, path: string][] = [
  ["@duckdb/duckdb-wasm", "1.28.0", "+esm"],
  ["@observablehq/inputs", "0.10.6", "+esm"],
  ["@observablehq/plot", "0.6.11", "+esm"],
  ["@viz-js/viz", "3.2.3", "+esm"],
  ["apache-arrow", "14.0.1", "+esm"],
  ["arquero", "5.3.0", "+esm"],
  ["canvas-confetti", "1.9.2", "+esm"],
  ["d3-dsv", "3.0.1", "+esm"],
  ["d3", "7.8.5", "+esm"],
  ["exceljs", "4.4.0", "+esm"],
  ["htl", "0.3.1", "+esm"],
  ["jszip", "3.10.1", "+esm"],
  ["katex", "0.16.9", "+esm"],
  ["katex", "0.16.9", "dist/katex.min.css"],
  ["leaflet", "1.9.4", "+esm"],
  ["lodash", "4.17.21", "+esm"],
  ["mapbox-gl", "3.1.2", "+esm"],
  ["mermaid", "10.6.1", "+esm"],
  ["parquet-wasm", "0.6.0-beta.1", "+esm"],
  ["sql.js", "1.9.0", "+esm"],
  ["topojson-client", "3.1.0", "+esm"]
];

export function mockJsDelivr() {
  mockAgent();
  before(async () => {
    const agent = getCurrentAgent();
    const dataClient = agent.get("https://data.jsdelivr.com");
    for (const [name, version] of packages) {
      dataClient
        .intercept({path: `/v1/packages/npm/${name}/resolved`, method: "GET"})
        .reply(200, {version}, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist();
    }
    const cdnClient = agent.get("https://cdn.jsdelivr.net");
    for (const [name, version, path] of packages) {
      cdnClient
        .intercept({path: `/npm/${name}@${version}/${path}`, method: "GET"})
        .reply(200, "", {headers: {"cache-control": "public, immutable", "content-type": "text/javascript; charset=utf-8"}})
        .persist(); // prettier-ignore
    }
  });
}
