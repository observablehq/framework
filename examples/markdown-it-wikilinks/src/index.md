# markdown-it-wikilinks

This Framework example demonstrates how to use [`markdown-it-wikilinks`](https://github.com/jsepia/markdown-it-wikilinks) to create Wikimedia-style links in Markdown.

First, install `markdown-it-wikilinks` with your preferred package manager such as npm or Yarn. Then, register the plugin using the **markdownIt** config option in your `observablehq.config.js` file.

```js run=false
import MarkdownItWikilinks from "markdown-it-wikilinks";

export default {
  root: "src",
  markdownIt: (md) => md.use(MarkdownItWikilinks())
};
```

Below is an example of a wikilink.

Click [[Wiki Links|here]] to learn about [[/Wiki]] links.

```md run=false
Click [[Wiki Links|here]] to learn about [[/Wiki]] links.
```
