export default {
  title: "Observable CLI",
  pages: [
    {name: "Getting started", path: "/getting-started"},
    {name: "Routing", path: "/routing"},
    {name: "Markdown", path: "/markdown"},
    {name: "JavaScript", path: "/javascript"},
    {name: "Data loaders", path: "/loaders"},
    {name: "Configuration", path: "/config"},
    {
      name: "JavaScript",
      pages: [
        {name: "Reactivity", path: "/javascript/reactivity"},
        {name: "Display", path: "/javascript/display"},
        {name: "Imports", path: "/javascript/imports"},
        {name: "Files", path: "/javascript/files"},
        {name: "Promises", path: "/javascript/promises"},
        {name: "Generators", path: "/javascript/generators"},
        {name: "Mutables", path: "/javascript/mutables"}
      ]
    },
    {
      name: "Libraries",
      open: false,
      pages: [
        {name: "Apache Arrow", path: "/lib/arrow"},
        {name: "Arquero", path: "/lib/arquero"},
        {name: "CSV", path: "/lib/csv"},
        {name: "D3", path: "/lib/d3"},
        {name: "DOT (Graphviz)", path: "/lib/dot"},
        {name: "DuckDB", path: "/lib/duckdb"},
        {name: "Hypertext Literal", path: "/lib/htl"},
        {name: "Leaflet", path: "/lib/leaflet"},
        {name: "Lodash", path: "/lib/lodash"},
        {name: "Mermaid", path: "/lib/mermaid"},
        {name: "Microsoft Excel", path: "/lib/xlsx"},
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
    {name: "Contributing", path: "/contributing"}
  ],
  footer: `© ${new Date().getUTCFullYear()} Observable, Inc.`,
  deploy: {
    workspace: "@observablehq",
    project: "cli"
  }
};
