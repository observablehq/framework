import {getCurrentAgent, mockAgent} from "./undici.js";

const packages: [name: string, version: string][] = [
  ["@duckdb/duckdb-wasm", "1.28.0"],
  ["@observablehq/inputs", "0.10.6"],
  ["@observablehq/plot", "0.6.11"],
  ["@viz-js/viz", "3.2.3"],
  ["apache-arrow", "14.0.1"],
  ["arquero", "5.3.0"],
  ["canvas-confetti", "1.9.2"],
  ["d3-dsv", "3.0.1"],
  ["d3", "7.8.5"],
  ["exceljs", "4.4.0"],
  ["htl", "0.3.1"],
  ["jszip", "3.10.1"],
  ["katex", "0.16.9"],
  ["leaflet", "1.9.4"],
  ["lodash", "4.17.21"],
  ["mapbox-gl", "3.1.2"],
  ["mermaid", "10.6.1"],
  ["parquet-wasm", "0.6.0-beta.1"],
  ["sql.js", "1.9.0"],
  ["topojson-client", "3.1.0"]
];

export function mockJsDelivr() {
  mockAgent();
  before(async () => {
    const agent = getCurrentAgent();
    const dataClient = agent.get("https://data.jsdelivr.com");
    const cdnClient = agent.get("https://cdn.jsdelivr.net");
    for (const [name, version] of packages) {
      dataClient
        .intercept({path: `/v1/packages/npm/${name}/resolved`, method: "GET"})
        .reply(200, {version}, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist();
      cdnClient
        .intercept({path: new RegExp(`^/npm/${name}@${version}/`), method: "GET"})
        .reply(200, "", {headers: {"cache-control": "public, immutable", "content-type": "text/javascript; charset=utf-8"}})
        .persist(); // prettier-ignore
    }
  });
}
