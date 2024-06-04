import MarkdownItContainer from "markdown-it-container";

export default {
  root: "src",

  // Register the markdown-it-container plugin.
  markdownIt: (md) =>
    md
      .use(MarkdownItContainer, "card") // ::: card
      .use(MarkdownItContainer, "tip") // ::: tip
      .use(MarkdownItContainer, "warning") // ::: warning
};
