# Markdown

See [GitHub’s guide to Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) for an introduction.

Here are a few examples of Markdown content to get you started.

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
| one | two | three |
|---|---|---|
| 1 | 2 | 3 |
```

## Lists

```md
- one
- two
- three
```

## Links

```md
[relative link](./dashboard)
[external link](https://example.com)
```

## Images

```md
![A happy kitten](https://placekitten.com/200/300)
```

## HTML

You can write HTML directly into Markdown. HTML is useful for greater control over layout, say to use CSS grid for a responsive bento box layout in a dashboard, or adding an external stylesheet via a link element. For example, here is an HTML details element:

````html
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
