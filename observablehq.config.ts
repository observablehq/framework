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
    {name: "Embedding", path: "/embeds"},
    {
      name: "Reference",
      open: false,
      pages: [
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
        {name: "Configuration", path: "/config"}
      ]
    },
    {
      name: "Inputs",
      open: false,
      pager: "inputs",
      path: "/inputs/",
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
        {name: "Observable Plot", path: "/lib/plot"},
        {name: "Shapefile", path: "/lib/shapefile"},
        {name: "SQLite", path: "/lib/sqlite"},
        {name: "TeX", path: "/lib/tex"},
        {name: "TopoJSON", path: "/lib/topojson"},
        {name: "Vega-Lite", path: "/lib/vega-lite"},
        {name: "ZIP", path: "/lib/zip"}
      ]
    },
    {name: "Examples", path: "https://github.com/observablehq/framework/tree/main/examples"},
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
  home: `<span style="display: flex; align-items: center; font-weight: 500; gap: 0.5rem; margin-left: -0.5rem; color: var(--theme-foreground);">
    ${logo()} Framework
  </span>`,
  header: `<div style="display: flex; flex-grow: 1; align-items: center; justify-content: space-between; white-space: nowrap;">
    <div>
      <a href="/" class="hide-if-sidebar" style="display: flex; align-items: center; gap: 0.5rem;">
        ${logo()} Framework
      </a>
    </div>
    <div style="display: flex; align-items: center; gap: 1rem; font-size: 14px; ">
      <a class="desktop-only" target="_blank" title="${
        process.env.npm_package_version
      } release notes" href="https://github.com/observablehq/framework/releases"><span>${
        process.env.npm_package_version
      }</span></a>
      <a class="desktop-only" target="_blank" data-decoration="★" title="${stargazers_count.toLocaleString(
        "en-US"
      )} GitHub stars" href="https://github.com/observablehq/framework"><span>GitHub️ ${
        stargazers_count ? formatPrefix(".1s", 1000)(stargazers_count) : ""
      }</span></a>
      <a class="mobile-only" target="_blank" title="${stargazers_count.toLocaleString(
        "en-US"
      )} GitHub stars" href="https://github.com/observablehq/framework">
        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
          <path d="M19.625 5.60534C18.7083 4.03477 17.4649 2.79135 15.8945 1.87479C14.3238 0.958185 12.6091 0.5 10.7492 0.5C8.88947 0.5 7.17422 0.958325 5.60388 1.87479C4.0333 2.7913 2.78997 4.03477 1.87332 5.60534C0.956814 7.17587 0.498535 8.89089 0.498535 10.7504C0.498535 12.984 1.15021 14.9926 2.4539 16.7766C3.75744 18.5607 5.44142 19.7952 7.50571 20.4803C7.746 20.5249 7.92388 20.4936 8.03954 20.387C8.15524 20.2804 8.21302 20.1467 8.21302 19.9868C8.21302 19.9601 8.21073 19.7199 8.20629 19.266C8.20171 18.8122 8.19956 18.4162 8.19956 18.0783L7.89256 18.1315C7.69682 18.1673 7.44989 18.1825 7.15178 18.1782C6.8538 18.174 6.54446 18.1428 6.22419 18.0847C5.90377 18.0272 5.60575 17.8937 5.32988 17.6846C5.05416 17.4755 4.85842 17.2018 4.74272 16.8639L4.60925 16.5568C4.52029 16.3523 4.38023 16.1251 4.18888 15.8761C3.99754 15.6269 3.80405 15.458 3.60831 15.369L3.51486 15.3021C3.45259 15.2577 3.39481 15.204 3.34138 15.1418C3.28799 15.0796 3.24802 15.0173 3.22132 14.955C3.19458 14.8926 3.21674 14.8414 3.28804 14.8012C3.35933 14.761 3.48817 14.7416 3.67512 14.7416L3.94196 14.7814C4.11993 14.8171 4.34007 14.9236 4.60266 15.1017C4.86511 15.2796 5.08085 15.5109 5.24994 15.7956C5.4547 16.1605 5.7014 16.4385 5.99072 16.6299C6.27982 16.8212 6.5713 16.9167 6.86488 16.9167C7.15846 16.9167 7.41203 16.8945 7.62567 16.8502C7.83908 16.8057 8.0393 16.7388 8.22625 16.6499C8.30633 16.0535 8.52437 15.5953 8.88017 15.275C8.37304 15.2217 7.9171 15.1414 7.51212 15.0347C7.10736 14.9278 6.6891 14.7544 6.25761 14.5139C5.82589 14.2738 5.46774 13.9756 5.18309 13.6198C4.89839 13.2639 4.66474 12.7966 4.48247 12.2183C4.3001 11.6399 4.20889 10.9726 4.20889 10.2163C4.20889 9.13941 4.56044 8.22304 5.26341 7.46665C4.93411 6.65705 4.96519 5.74947 5.35676 4.744C5.61482 4.66382 5.9975 4.72399 6.50463 4.92412C7.01186 5.12434 7.38323 5.29587 7.61912 5.43808C7.85502 5.58024 8.04402 5.70071 8.18642 5.79842C9.01411 5.56715 9.86825 5.45149 10.7491 5.45149C11.6299 5.45149 12.4843 5.56715 13.312 5.79842L13.8192 5.47823C14.166 5.26459 14.5756 5.06881 15.0469 4.89083C15.5185 4.71295 15.8791 4.66396 16.1284 4.74414C16.5286 5.74966 16.5643 6.65719 16.2349 7.46679C16.9378 8.22318 17.2895 9.13978 17.2895 10.2164C17.2895 10.9727 17.198 11.6421 17.0159 12.225C16.8336 12.808 16.5979 13.2749 16.3088 13.6265C16.0194 13.9781 15.659 14.274 15.2275 14.5141C14.7959 14.7544 14.3775 14.9278 13.9728 15.0347C13.5678 15.1415 13.1119 15.2219 12.6047 15.2752C13.0673 15.6755 13.2986 16.3073 13.2986 17.1704V19.9864C13.2986 20.1464 13.3542 20.2799 13.4656 20.3867C13.5768 20.4932 13.7524 20.5246 13.9927 20.4799C16.0573 19.7949 17.7413 18.5603 19.0448 16.7762C20.3481 14.9922 21 12.9837 21 10.75C20.9996 8.89075 20.541 7.17587 19.625 5.60534Z" fill="currentColor" />
        </svg></a>
        <script async defer src="https://static.observablehq.com/assets/components/observable-made-by.js"></script>
        <observable-made-by />
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

function logo() {
  return `<svg width="24" height="24" viewBox="0 0 21.92930030822754 22.68549919128418" fill="currentColor">
  <path d="M10.9646 18.9046C9.95224 18.9046 9.07507 18.6853 8.33313 18.2467C7.59386 17.8098 7.0028 17.1909 6.62722 16.4604C6.22789 15.7003 5.93558 14.8965 5.75735 14.0684C5.56825 13.1704 5.47613 12.2574 5.48232 11.3427C5.48232 10.6185 5.52984 9.92616 5.62578 9.26408C5.7208 8.60284 5.89715 7.93067 6.15391 7.24843C6.41066 6.56618 6.74143 5.97468 7.14438 5.47308C7.56389 4.9592 8.1063 4.54092 8.72969 4.25059C9.38391 3.93719 10.1277 3.78091 10.9646 3.78091C11.977 3.78091 12.8542 4.00021 13.5962 4.43879C14.3354 4.87564 14.9265 5.49454 15.3021 6.22506C15.6986 6.97704 15.9883 7.7744 16.1719 8.61712C16.3547 9.459 16.447 10.3681 16.447 11.3427C16.447 12.067 16.3995 12.7593 16.3035 13.4214C16.2013 14.1088 16.0206 14.7844 15.7644 15.437C15.4994 16.1193 15.1705 16.7108 14.7739 17.2124C14.3774 17.714 13.8529 18.1215 13.1996 18.4349C12.5463 18.7483 11.8016 18.9046 10.9646 18.9046ZM12.8999 13.3447C13.4242 12.8211 13.7159 12.0966 13.7058 11.3427C13.7058 10.5639 13.4436 9.89654 12.92 9.34074C12.3955 8.78495 11.7441 8.50705 10.9646 8.50705C10.1852 8.50705 9.53376 8.78495 9.00928 9.34074C8.49569 9.87018 8.21207 10.5928 8.22348 11.3427C8.22348 12.1216 8.48572 12.7889 9.00928 13.3447C9.53376 13.9005 10.1852 14.1784 10.9646 14.1784C11.7441 14.1784 12.3891 13.9005 12.8999 13.3447ZM10.9646 22.6855C17.0199 22.6855 21.9293 17.6068 21.9293 11.3427C21.9293 5.07871 17.0199 0 10.9646 0C4.90942 0 0 5.07871 0 11.3427C0 17.6068 4.90942 22.6855 10.9646 22.6855Z"></path>
</svg>`;
}
