import MarkdownItFootnote from "markdown-it-footnote";

export default {
  root: "src",
  title: "Framework + markdown-it-footnote",

  // Register the markdown-it-footnote plugin.
  markdownIt: (md) => md.use(MarkdownItFootnote)
};
