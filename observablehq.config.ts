export default {
  title: "Observable CLI",
  pages: [
    {name: "Getting started", path: "/getting-started"},
    {name: "Routing", path: "/routing"},
    {name: "Markdown", path: "/markdown"},
    {name: "JavaScript", path: "/javascript"},
    {name: "Data loaders", path: "/loaders"},
    {name: "Components", path: "/components"},
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
        {name: "Mutables", path: "/javascript/mutables"},
      ]
    },
    {
      name: "Inputs",
      open: false,
      pages: [
        {name: "Button", path: "/inputs/button"},
        {name: "Checkbox", path: "/inputs/checkbox"},
        {name: "Color", path: "/inputs/color"},
        {name: "Date/Datetime", path: "/inputs/date"},
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
      name: "Charts",
      open: false,
      pages: [
        {name: "Lines", path: "/charts/line"},
        {name: "Bars", path: "/charts/bar"},
        {name: "Points", path: "/charts/point"},
        {name: "Area", path: "/charts/area"},
        {name: "Cell", path: "/charts/cell"},
        {name: "Tick", path: "/charts/tick"},
        {name: "Arrow", path: "/charts/arrow"},
        {name: "Hexbin", path: "/charts/hexbin"},
        {name: "Facets", path: "/charts/facets"}
      ]
    },
    {
      name: "Layout",
      open: false,
      pages: [
        {name: "Big number", path: "/layout/bignumber"},
        {name: "Resize", path: "/layout/resize"},
        {name: "Card", path: "/layout/card"},
        {name: "Grid", path: "/layout/grid"}
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
        {name: "ZIP", path: "/lib/zip"},
      ]
    },
    {name: "Contributing", path: "/contributing"}
  ],
  footer: `© ${new Date().getUTCFullYear()} Observable, Inc.`
};
