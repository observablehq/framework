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

- **title** - the page title; defaults to the (first) first-level heading of the page, if any
- **index** - whether to index this page if [search](./search) is enabled; defaults to true for listed pages
- **keywords** <a href="https://github.com/observablehq/framework/releases/tag/v1.1.0" class="observablehq-version-badge" data-version="^1.1.0" title="Added in v1.1.0"></a> - additional words to index for [search](./search); boosted at the same weight as the title
- **draft** <a href="https://github.com/observablehq/framework/releases/tag/v1.1.0" class="observablehq-version-badge" data-version="^1.1.0" title="Added in v1.1.0"></a> - whether to skip this page during build; drafts are also not listed in the default sidebar
- **sql** <a href="https://github.com/observablehq/framework/releases/tag/v1.2.0" class="observablehq-version-badge" data-version="^1.2.0" title="Added in v1.2.0"></a> - table definitions for [SQL code blocks](./sql)

The front matter can also override the following [project configuration](./config) options:

- **toc** - the [table of contents](./config#toc)
- **style** - the [custom stylesheet](./config#style)
- **theme** - the [theme](./config#theme)
- **head** - the [head](./config#head)
- **header** - the [header](./config#header)
- **footer** - the [footer](./config#footer)
- **sidebar** - whether to show the [sidebar](./config#sidebar)

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

For privacy and convenience, external links are given a default `rel` attribute of [`noreferrer`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noreferrer) [`noopener`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noopener) and a default `target` attribute of [`_blank`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target). <a href="https://github.com/observablehq/framework/releases/tag/v1.5.0" class="observablehq-version-badge" data-version="^1.5.0" title="Added in 1.5.0"></a> Hence by default an external link will open in a new window and not pass the (potentially sensitive) referrer to the (potentially untrusted) external site. You can override this behavior by specifying the `rel` or `target` attribute explicitly. For example `<a href="https://example.com" target="_self">` will open in the same window, and `<a href="https://acme.com" rel="">` will allow the referrer.

## Images

```md
![A horse](./horse.jpg)
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

You can put Markdown inside of HTML by surrounding it with blank lines:

<div class="grid grid-cols-4">
  <div class="card">

## Card title

This is **Markdown** inside of _HTML_!

  </div>
</div>

```md run=false
<div class="grid grid-cols-4">
  <div class="card">

## Card title

This is **Markdown** inside of _HTML_!

  </div>
</div>
```

Also see [Hypertext Literal](./lib/htl) for generating dynamic HTML in JavaScript.
