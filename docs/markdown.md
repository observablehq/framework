# Markdown

Markdown in the Observable CLI follows the [CommonMark spec](https://spec.commonmark.org/) and is powered by [markdown-it](https://github.com/markdown-it/markdown-it).  We also feature [live JavaScript](./javascript) as either [fenced code blocks](./javascript#fenced-code-blocks) (<code>```js</code>) or [inline expressions](./javascript#inline-expressions) (<code>$\{…}</code>), and [HTML in Markdown](#html), and [front matter](#front-matter) for page-level configuration. If you don’t already know Markdown, please see [GitHub’s guide to Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) for an introduction.

_Note: The Observable CLI currently deviates from CommonMark in how blank lines are handled in HTML; see below. This is a limitation of our parser needed for incremental update during preview._

Here are a few examples of Markdown content to get you started.

## Front matter

```yaml
---
title: My favorite page
toc: false
---
```

## Headings

```md
# A first-level heading
## A second-level heading
### A third-level heading
```

Note: a second-level heading (`##`) immediately following a first-level heading (`#`) is styled specially as a subtitle.

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

````html run=false
<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>
````

This produces:

<details>
  <summary>Click me</summary>
  This text is not visible by default.
</details>

In Markdown, blank lines denote separate HTML blocks; be sure to avoid blank lines if you want to treat a chunk of HTML as a single block. For example, write this:

```md
<!-- 👍 one HTML block -->
<ul>
  <li>one</li>
  <li>two</li>
  <li>three</li>
</ul>
```

Don’t write this:

```md
<!-- 👎 three HTML blocks -->
<ul>

  <li>one</li>
  <li>two</li>
  <li>three</li>

</ul>
```

In the latter case, the li elements become top-level and wrapped in a span, rather than children of the ul.

Also see [Hypertext Literal](./lib/htl) for generating dynamic HTML in JavaScript.
