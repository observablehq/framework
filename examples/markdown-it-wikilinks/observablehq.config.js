import MarkdownItWikilinks from "markdown-it-wikilinks";

export default {
  root: "src",

  // Register the markdown-it-wikilinks plugin.
  markdownIt: (md) => md.use(MarkdownItWikilinks())
};
