---
index: true
---

# Search

Search is an experimental feature that works in two stages: on the server, an index of the contents gets built with the site. On the client, when the user focuses and starts typing in the search input, the index is retrieved and the matching pages are shown in the sidebar.

To enable search on your project, add a **search**: true option to your site’s [configuration](config).

Indexation and retrieval are using [MiniSearch](https://lucaong.github.io/minisearch/), a JavaScript library that enables full-text search with many useful features (like prefix search, fuzzy search, ranking, boosting of fields).

The pages are indexed when you build, or deploy, your project, and every 10 minutes with the preview server.

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

The selected pages are sorted by descending relevance (with a score computed by MiniSearch). A series of dots represents that relevance; filled dots indicate exact matches while hollow dots representing fuzzy matches (there can be a combination of both when there are multiple terms in the query).
