import {getCurrentAgent, mockAgent} from "./undici.js";

const packages: [name: string, {version: string; contents?: string; dependencies?: Record<string, string>}][] = [
  ["@duckdb/duckdb-wasm", {version: "1.28.0"}],
  ["@example/url-import", {version: "1.0.0", contents: "import('https://example.com');"}],
  ["@observablehq/inputs", {version: "0.10.6"}],
  ["@observablehq/plot", {version: "0.6.11"}],
  ["@observablehq/sample-datasets", {version: "1.0.1"}],
  ["@viz-js/viz", {version: "3.2.3"}],
  ["apache-arrow", {version: "15.0.1"}],
  ["arquero", {version: "5.3.0"}],
  ["canvas-confetti", {version: "1.9.2"}],
  ["d3-array", {version: "3.2.4"}],
  ["d3-dsv", {version: "3.0.1"}],
  ["d3", {version: "7.8.5", dependencies: {"d3-array": "3"}}],
  ["echarts", {version: "5.5.0"}],
  ["exceljs", {version: "4.4.0"}],
  ["htl", {version: "0.3.1"}],
  ["isoformat", {version: "0.2.1"}],
  ["jszip", {version: "3.10.1"}],
  ["katex", {version: "0.16.9"}],
  ["leaflet", {version: "1.9.4"}],
  ["lodash", {version: "4.17.21"}],
  ["mapbox-gl", {version: "3.1.2"}],
  ["mermaid", {version: "10.6.1"}],
  ["parquet-wasm", {version: "0.6.0"}],
  ["react", {version: "18.3.1"}],
  ["react-dom", {version: "18.3.1"}],
  ["sql.js", {version: "1.9.0"}],
  ["topojson-client", {version: "3.1.0"}]
];

export function mockJsDelivr() {
  mockAgent();
  before(async () => {
    const agent = getCurrentAgent();
    const registryClient = agent.get("https://registry.npmjs.org");
    const cdnClient = agent.get("https://cdn.jsdelivr.net");
    for (const [name, pkg] of packages) {
      registryClient
        .intercept({path: `/${name}/latest`, method: "GET"})
        .reply(200, {version: pkg.version}, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist();
      registryClient
        .intercept({path: `/${name}`, method: "GET"})
        .reply(200, {versions: {[pkg.version]: {}}}, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist();
      cdnClient
        .intercept({path: `/npm/${name}@${pkg.version}/package.json`, method: "GET"})
        .reply(200, pkg, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist(); // prettier-ignore
      cdnClient
        .intercept({path: new RegExp(`^/npm/${name}@${pkg.version}/`), method: "GET"})
        .reply(200, pkg.contents ?? "", {headers: {"cache-control": "public, immutable", "content-type": "text/javascript; charset=utf-8"}})
        .persist(); // prettier-ignore
    }
  });
}
