export default {
  pages: [
    {path: "/index", name: "Index"},
    {path: "/one", name: "One<Two"},
    {path: "/sub/two", name: "Two"},
    {
      name: "Closed subsection",
      open: false,
      pages: [{path: "/closed/page", name: "Closed page"}]
    }
  ],
  toc: {
    label: "On this page"
  },
  deploy: {
    workspace: "acme",
    project: "bi"
  }
};
