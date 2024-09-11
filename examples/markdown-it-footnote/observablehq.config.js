import MarkdownItFootnote from "markdown-it-footnote";

export default {
  root: "src",

  // Register the markdown-it-footnote plugin.
  markdownIt: (md) => md.use(MarkdownItFootnote)
};
