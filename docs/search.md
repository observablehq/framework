---
index: true
---

# Search

Search works in two stages: when Framework builds the site, it also creates an index of the contents. On the client, as soon as the user focuses the search input and starts typing a query, the index is retrieved and the matching pages are displayed in the sidebar. The user can then click on a result, or use the up ↑ and down ↓ arrow keys to navigate, then type return to open the page.

To enable search on your project, add a **search**: true option to your site’s [configuration](config).

Indexation and retrieval are using [MiniSearch](https://lucaong.github.io/minisearch/), a JavaScript library that enables full-text search with many useful features (like prefix search, fuzzy search, ranking, boosting of fields).

The pages are indexed each time you build, or deploy, your project; when working in preview, they are reindexed every 10 minutes.

By default, all the pages found in the docs/ folder or defined in the configuration’s **pages** are indexed; you can however opt-out a page from the index by specifying an index: false property in its front-matter:

```yaml
---
title: This page won’t be indexed
index: false
---
```

Likewise, a page that is not referenced in the configuration’s **pages** can opt-in by having index: true in its front-matter:

```yaml
---
title: A page that is not in the sidebar, but gets indexed
index: true
---
```

Search is case-insensitive. The indexing script tries to avoid common pitfalls by ignoring HTML tags and non-word characters (such as punctuation, backticks, etc.) found in the pages’ markdown. It also ignores long words as well as sequences that contain more than 6 digits (such as API keys, for example).

The selected pages are sorted by descending relevance, represented by a number of dots that reflects the terms found (exactly or with a fuzzy match) in the page, with less points given to relatively frequent terms, and more points given to terms found in the title.
