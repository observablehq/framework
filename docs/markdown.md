# Markdown

See [GitHub’s guide to Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) for an introduction.

What’s different about Observable Markdown?

- [Live JavaScript](./javascript), either as code blocks or inline expressions
- Built-in support for [${tex`\TeX`}](./lib/tex), [Dot (GraphViz)](./lib/dot), and [Mermaid](./lib/mermaid)
- [HTML](./html) (but watch out for blank lines)
- YAML front matter

## Headings

```md
# A first-level heading
## A second-level heading
### A third-level heading
```

TK Something about h2 immediately following h1 being treated specially.

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
