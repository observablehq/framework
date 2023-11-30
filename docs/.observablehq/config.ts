export default {
  title: "Observable CLI",
  pages: [
    {name: "Getting started", path: "/getting-started"},
    {name: "Markdown", path: "/markdown"},
    {name: "JavaScript", path: "/javascript"},
    {name: "Data loaders", path: "/loaders"},
    {
      name: "JavaScript",
      pages: [
        {name: "Reactivity", path: "/javascript/reactivity"},
        {name: "Display", path: "/javascript/display"},
        {name: "Files", path: "/javascript/files"},
        {name: "Promises", path: "/javascript/promises"},
        {name: "Generators", path: "/javascript/generators"},
        {name: "Mutables", path: "/javascript/mutables"},
        {name: "Imports", path: "/javascript/imports"},
        {name: "Inputs", path: "/javascript/inputs"},
        {name: "DuckDB", path: "/javascript/duckdb"}
      ]
    },
    {
      name: "Features",
      pages: [
        {name: "HTML", path: "/html"},
        {name: "DOT", path: "/dot"},
        {name: "Mermaid", path: "/mermaid"},
        {name: "TeX", path: "/tex"}
      ]
    },
    {name: "Contributing", path: "/contributing"}
  ]
};
