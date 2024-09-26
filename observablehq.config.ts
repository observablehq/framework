import {existsSync} from "node:fs";
import {readFile, readdir, stat} from "node:fs/promises";
import {join} from "node:path/posix";
import {formatPrefix} from "d3-format";
import {themes} from "./docs/themes.md.ts";

let stargazers_count: number;
try {
  ({stargazers_count} = await github("/repos/observablehq/framework"));
} catch (error) {
  if (process.env.CI) throw error;
  stargazers_count = NaN;
}

export default {
  root: "docs",
  output: "docs/.observablehq/dist",
  title: "Observable Framework",
  pages: [
    {name: "What is Framework?", path: "/what-is-framework"},
    {name: "Getting started", path: "/getting-started"},
    {name: "Deploying", path: "/deploying"},
    {name: "Project structure", path: "/project-structure"},
    {name: "Markdown", path: "/markdown"},
    {name: "JavaScript", path: "/javascript"},
    {name: "Reactivity", path: "/reactivity"},
    {name: "JSX", path: "/jsx"},
    {name: "Imports", path: "/imports"},
    {name: "Data loaders", path: "/data-loaders"},
    {name: "Files", path: "/files"},
    {name: "SQL", path: "/sql"},
    {name: "Themes", path: "/themes"},
    {name: "Page loaders", path: "/page-loaders"},
    {name: "Parameterized routes", path: "/params"},
    {name: "Embedded analytics", path: "/embeds"},
    {name: "Configuration", path: "/config"},
    {name: "Examples", path: "https://github.com/observablehq/framework/tree/main/examples"},
    {
      name: "Inputs",
      open: false,
      pager: "inputs",
      pages: [
        {name: "Button", path: "/inputs/button"},
        {name: "Checkbox", path: "/inputs/checkbox"},
        {name: "Color", path: "/inputs/color"},
        {name: "Date", path: "/inputs/date"},
        {name: "File", path: "/inputs/file"},
        {name: "Form", path: "/inputs/form"},
        {name: "Radio", path: "/inputs/radio"},
        {name: "Range", path: "/inputs/range"},
        {name: "Search", path: "/inputs/search"},
        {name: "Select", path: "/inputs/select"},
        {name: "Table", path: "/inputs/table"},
        {name: "Text", path: "/inputs/text"},
        {name: "Textarea", path: "/inputs/textarea"},
        {name: "Toggle", path: "/inputs/toggle"}
      ]
    },
    {
      name: "Libraries",
      open: false,
      pager: false,
      pages: [
        {name: "Apache Arrow", path: "/lib/arrow"},
        {name: "Arquero", path: "/lib/arquero"},
        {name: "CSV", path: "/lib/csv"},
        {name: "D3", path: "/lib/d3"},
        {name: "Deck.gl", path: "/lib/deckgl"},
        {name: "DOT (Graphviz)", path: "/lib/dot"},
        {name: "DuckDB", path: "/lib/duckdb"},
        {name: "Hypertext Literal", path: "/lib/htl"},
        {name: "Leaflet", path: "/lib/leaflet"},
        {name: "Lodash", path: "/lib/lodash"},
        {name: "Mapbox GL JS", path: "/lib/mapbox-gl"},
        {name: "Mermaid", path: "/lib/mermaid"},
        {name: "Microsoft Excel (XLSX)", path: "/lib/xlsx"},
        {name: "Mosaic vgplot", path: "/lib/mosaic"},
        {name: "Observable Generators", path: "/lib/generators"},
        {name: "Observable Inputs", path: "/lib/inputs"},
        {name: "Observable Plot", path: "/lib/plot"},
        {name: "Shapefile", path: "/lib/shapefile"},
        {name: "SQLite", path: "/lib/sqlite"},
        {name: "TeX", path: "/lib/tex"},
        {name: "TopoJSON", path: "/lib/topojson"},
        {name: "Vega-Lite", path: "/lib/vega-lite"},
        {name: "ZIP", path: "/lib/zip"}
      ]
    },
    {name: "Converting notebooks", path: "/convert"},
    {name: "Contributing", path: "/contributing", pager: false}
  ],
  dynamicPaths: [
    "/chart.js",
    "/theme/dark",
    "/theme/dark-alt",
    "/theme/dashboard",
    "/theme/light",
    "/theme/light-alt",
    "/theme/wide",
    ...themes.dark.map((theme) => `/theme/${theme}`),
    ...themes.light.map((theme) => `/theme/${theme}`)
  ],
  base: "/framework",
  globalStylesheets: [
    "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Spline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap"
  ],
  head: ({path}) => `<link rel="canonical" href="https://observablehq.com/framework${path.replace(/\/index$/, "/")}">
<link rel="apple-touch-icon" href="/observable.png">
<link rel="icon" type="image/png" href="/observable.png" sizes="32x32">${
    process.env.CI
      ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9B88TP6PKQ"></script>
<script>window.dataLayer=window.dataLayer||[];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js',new Date());\ngtag('config','G-9B88TP6PKQ');</script>`
      : ""
  }
<script type="module">/Win/.test(navigator.platform) || Array.from(document.querySelectorAll(".win"), (e) => e.remove())</script>`,
  header: `<div style="display: flex; flex-grow: 1; justify-content: flex-end; align-items: baseline;">
    <span style="display: flex; align-items: baseline; gap: 1rem; font-size: 14px;">
      <a target="_blank" title="${
        process.env.npm_package_version
      } release notes" href="https://github.com/observablehq/framework/releases"><span>${
        process.env.npm_package_version
      }</span></a>
      <a target="_blank" data-decoration="★" title="${stargazers_count.toLocaleString(
        "en-US"
      )} GitHub stars" href="https://github.com/observablehq/framework"><span>GitHub️ ${
        stargazers_count ? formatPrefix(".1s", 1000)(stargazers_count) : ""
      }</span></a>
    </span>
  </div>`,
  footer: `© ${new Date().getUTCFullYear()} Observable, Inc.`,
  style: "style.css",
  search: {
    async *index() {
      for (const name of await readdir("examples")) {
        const root = join("examples", name);
        if ((await stat(root)).isDirectory() && existsSync(join(root, "README.md"))) {
          const source = await readFile(join(root, "README.md"), "utf-8");
          yield {
            path: `https://observablehq.observablehq.cloud/framework-example-${name}/`,
            title: source
              .split("\n")
              .find((line) => line.startsWith("# "))
              ?.slice(2),
            text: source
          };
        }
      }
    }
  }
};

async function github(
  path: string,
  {
    authorization = process.env.GITHUB_TOKEN && `token ${process.env.GITHUB_TOKEN}`,
    accept = "application/vnd.github.v3+json"
  } = {}
) {
  const url = new URL(path, "https://api.github.com");
  const headers = {...(authorization && {authorization}), accept};
  const response = await fetch(url, {headers});
  if (!response.ok) throw new Error(`fetch error: ${response.status} ${url}`);
  return await response.json();
}
