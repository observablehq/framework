export default {
  pages: [{path: "/index", name: "Test page"}],
  template: (elements, options) => JSON.stringify({elements, options}, null, 2)
};
