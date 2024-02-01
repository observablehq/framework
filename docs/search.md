# Search

Search is an experimental feature that works in two stages: on the server, an index of the contents gets built with the site. On the client, when the user focuses and starts typing in the search input, the index is retrieved and the matching pages are shown in the sidebar.

To enable search on your project, add a **search**: true option to your site’s [configuration](config).

Indexation and retrieval are using [MiniSearch](https://lucaong.github.io/minisearch/), a JavaScript library that enables full-text search with many useful features (like prefix search, fuzzy search, ranking, boosting of fields).

The pages are indexed when you start the preview server, and also as you build, or deploy, your project. As a consequence, it does not track live changes to the pages when you edit the project.

By default, all the pages found in the docs/ folder are indexed; you can however opt-out a page from the index by specifying an index: false property in its front-matter:

```yaml
---
title: This page won’t be indexed
index: false
---
```

Search is case-insensitive. The indexing script tries to avoid common pitfalls by ignoring HTML tags and non-word characters (such as punctuation, backticks, etc.) found in the pages’ markdown. It also ignores long words or words that contain more than 6 digits (such as API keys, for example).

The selected pages are sorted by descending relevance (with a score computed by MiniSearch); dots represent that relevance, with filled dots indicating exact matches and hollow dots representing fuzzy matches (or a combination of both when there are multiple terms in the query).

The index is served as a FileAttachment called `minisearch.json`; if you want to index a completely different set of documents, you can use MiniSearch to build a different index with a [data loader](loaders). Make sure that each document has a title, and an id that represents its URL relative to the project root. For instance, this page’s id is `search`.

_As an experimental feature, this is poised to change as we get more varied use cases, as well as feedback and suggestions._
