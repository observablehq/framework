---
index: true
---

# Search

Framework provides built-in full-text page search using [MiniSearch](https://lucaong.github.io/minisearch/). Search results are queried on the client, with fuzzy and prefix matching, using a static index computed during build.

<div class="tip">Search is not enabled by default. It is intended for larger projects with lots of static text, such as reports and documentation. Search will not index dynamic content such as data or charts. To enable search, set the <a href="./config#search"><b>search</b> option</a> to true in your config.</div>

Search works in two stages: when Framework builds the site, it creates an index of the contents. On the client, as soon as the user focuses the search input and starts typing, the index is retrieved and the matching pages are displayed in the sidebar. The user can then click on a result, or use the up ↑ and down ↓ arrow keys to navigate, then type return to open the page.

Pages are indexed each time you build or deploy your project. When working in preview, they are reindexed every 10 minutes.

By default, all the pages found in the project root (`docs` by default) or defined in the [**pages** config option](./config#pages) are indexed; you can however opt-out a page from the index by specifying an index: false property in its front matter:

```yaml
---
title: This page won’t be indexed
index: false
---
```

Likewise, a page that is not referenced in **pages** can opt-in by having index: true in its front matter:

```yaml
---
title: A page that is not in the sidebar, but gets indexed
index: true
---
```

Search is case-insensitive. The indexing script tries to avoid common pitfalls by ignoring HTML tags and non-word characters such as punctuation. It also ignores long words, as well as sequences that contain more than 6 digits (such as API keys, for example).

You can specify additional comma-separated words to index using the **keywords** option in [Markdown front matter](./markdown). For example:

```yaml
---
keywords: file, fileattachment
---
```

These keywords are boosted at the same weight as the page title.
