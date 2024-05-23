export default (config) => ({
  title: "config 3",
  pages: [...config.pages, {path: "/page2", name: "Page 2"}]
});
