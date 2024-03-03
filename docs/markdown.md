# Markdown

Markdown in Observable Framework follows the [CommonMark spec](https://spec.commonmark.org/) and is powered by [markdown-it](https://github.com/markdown-it/markdown-it).  We also feature [live JavaScript](./javascript) as either [fenced code blocks](./javascript#fenced-code-blocks) (<code>```js</code>) or [inline expressions](./javascript#inline-expressions) (<code>$\{…}</code>), and [HTML in Markdown](#html), and [front matter](#front-matter) for page-level configuration. If you don’t already know Markdown, please see [GitHub’s guide to Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) for an introduction.

Here are a few examples of Markdown content to get you started.

## Front matter

```yaml
---
title: My favorite page
toc: false
---
```

The front matter supports the following options:

- **title** — the page title; defaults to the (first) first-level heading of the page, if any
- **toc** — if false, disables the [table of contents](./config#toc)
- **index** — whether to index this page if [search](./search) is enabled; defaults to true for listed pages
- **keywords** - additional words to index for [search](./search); boosted at the same weight as the title
- **draft** — whether to skip this page during build; drafts are also not listed in the default sidebar

## Headings

```md
# A first-level heading
## A second-level heading
### A third-level heading
```

<div class="note">A second-level heading (<code>##</code>) immediately following a first-level heading (<code>#</code>) is styled specially as a subtitle.</div>

## Styling

```md
this is **bold** text
this is __bold__ text
this is *italic* text
this is _italic_ text
this is ~~strikethrough~~ text
this is `monospaced` text
> this is quoted text
```

## Tables

```md
Column 1   | Column 2     | Column 3
---------- | ------------ | ----------
Cell 1-1   | Cell 2-1     | Cell 3-1
Cell 1-2   | Cell 2-2     | Cell 3-2
```

```md
Align left | Align center | Align right
:--------- | :----------: | ----------:
Cell 1-1   |   Cell 2-1   |    Cell 3-1
Cell 1-2   |   Cell 2-2   |    Cell 3-2
```

## Lists

```md
- red
- green
- blue
  - light blue
  - dark blue
```

```md
1. first
1. second
1. third
   1. third first
   1. third second
```

## Links

```md
<https://example.com>
[relative link](./dashboard)
[external link](https://example.com)
[external link](<https://en.wikipedia.org/wiki/Tar_(computing)>)
```

## Images

```md
![A happy kitten](https://placekitten.com/200/300)
```

## HTML

You can write HTML directly into Markdown. HTML is useful for greater control over layout, say to use CSS grid for a responsive bento box layout in a dashboard, or adding an external stylesheet via a link element. For example, here is an HTML details element:

```html run=false
<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>
```

This produces:

<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>

Also see [Hypertext Literal](./lib/htl) for generating dynamic HTML in JavaScript.
