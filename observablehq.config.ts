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
  head: `<link rel="apple-touch-icon" href="/observable.png">
<link rel="icon" type="image/png" href="/observable.png" sizes="32x32">${
    process.env.CI
      ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9B88TP6PKQ"></script>
<script>window.dataLayer=window.dataLayer||[];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js',new Date());\ngtag('config','G-9B88TP6PKQ');</script>`
      : ""
  }
<script type="module">/Win/.test(navigator.platform) || Array.from(document.querySelectorAll(".win"), (e) => e.remove())</script>`,
  header: `<div style="display: flex; align-items: center; gap: 0.5rem; height: 2.2rem; margin: -1.5rem -2rem 2rem -2rem; padding: 0.5rem 2rem; border-bottom: solid 1px var(--theme-foreground-faintest); font: 500 16px var(--sans-serif);">
  <a href="https://observablehq.com/" target="_self" rel="" style="display: flex; align-items: center;">
    <svg width="22" height="22" viewBox="0 0 21.92930030822754 22.68549919128418" fill="currentColor">
      <path d="M10.9646 18.9046C9.95224 18.9046 9.07507 18.6853 8.33313 18.2467C7.59386 17.8098 7.0028 17.1909 6.62722 16.4604C6.22789 15.7003 5.93558 14.8965 5.75735 14.0684C5.56825 13.1704 5.47613 12.2574 5.48232 11.3427C5.48232 10.6185 5.52984 9.92616 5.62578 9.26408C5.7208 8.60284 5.89715 7.93067 6.15391 7.24843C6.41066 6.56618 6.74143 5.97468 7.14438 5.47308C7.56389 4.9592 8.1063 4.54092 8.72969 4.25059C9.38391 3.93719 10.1277 3.78091 10.9646 3.78091C11.977 3.78091 12.8542 4.00021 13.5962 4.43879C14.3354 4.87564 14.9265 5.49454 15.3021 6.22506C15.6986 6.97704 15.9883 7.7744 16.1719 8.61712C16.3547 9.459 16.447 10.3681 16.447 11.3427C16.447 12.067 16.3995 12.7593 16.3035 13.4214C16.2013 14.1088 16.0206 14.7844 15.7644 15.437C15.4994 16.1193 15.1705 16.7108 14.7739 17.2124C14.3774 17.714 13.8529 18.1215 13.1996 18.4349C12.5463 18.7483 11.8016 18.9046 10.9646 18.9046ZM12.8999 13.3447C13.4242 12.8211 13.7159 12.0966 13.7058 11.3427C13.7058 10.5639 13.4436 9.89654 12.92 9.34074C12.3955 8.78495 11.7441 8.50705 10.9646 8.50705C10.1852 8.50705 9.53376 8.78495 9.00928 9.34074C8.49569 9.87018 8.21207 10.5928 8.22348 11.3427C8.22348 12.1216 8.48572 12.7889 9.00928 13.3447C9.53376 13.9005 10.1852 14.1784 10.9646 14.1784C11.7441 14.1784 12.3891 13.9005 12.8999 13.3447ZM10.9646 22.6855C17.0199 22.6855 21.9293 17.6068 21.9293 11.3427C21.9293 5.07871 17.0199 0 10.9646 0C4.90942 0 0 5.07871 0 11.3427C0 17.6068 4.90942 22.6855 10.9646 22.6855Z"></path>
    </svg>
  </a>
  <div style="display: flex; flex-grow: 1; justify-content: space-between; align-items: baseline;">
    <a href="/">
      <span class="hide-if-small">Observable</span> Framework
    </a>
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
  </div>
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
