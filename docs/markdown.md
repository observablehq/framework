# Markdown

<div class="tip">See <a href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">GitHub’s guide to Markdown</a> for an introduction.</div>

<!-- Framework Markdown follows the [CommonMark spec](https://spec.commonmark.org/) and is powered by [markdown-it](https://github.com/markdown-it/markdown-it). -->

Markdown is a language for formatting text and content; it’s a lightweight, ergonomic alternative (and complement) to HTML. Markdown in Framework extends [CommonMark](https://commonmark.org/) with a handful of features useful for data apps, including [reactive](./reactivity) [JavaScript](./javascript), [HTML](#html), [YAML front matter](#front-matter), [grids](#grids), [cards](#cards), and [notes](#notes). This page covers both standard CommonMark features and Framework extensions.

## Routing

Framework uses file-based routing: each page in your project has a corresponding Markdown file (`.md`) of the same name. For example, here’s a simple project that only has two pages (`hello.md` and `index.md`) in the source root (`docs`):

```ini
.
├─ docs
│  ├─ hello.md
│  └─ index.md
└─ ...
```

<!-- In addition to pages, you can have [importable](./imports) JavaScript modules (`.js`), [data loaders](./loaders) for generating data snapshots (_e.g._, `.csv.py`), and [static assets](./data#files) such as images and files (_e.g._, `.png`). -->

When the site is built, the output root (`dist`) will contain two corresponding static HTML pages (`hello.html` and `index.html`), along with a few additional assets needed for the site to work.

```ini
.
├─ dist
│  ├─ _observablehq
│  │  └─ ... # additional assets for serving the site
│  ├─ hello.html
│  └─ index.html
└─ ...
```

For this site, routes map to files as:

```
/      → dist/index.html → docs/index.md
/hello → dist/hello.html → docs/hello.md
```

This assumes “clean URLs” as supported by most static site servers; `/hello` can also be accessed as `/hello.html`, and `/` can be accessed as `/index` and `/index.html`. (Some static site servers automatically redirect to clean URLs, but we recommend being consistent when linking to your site.)

Projects should always have a top-level `index.md`; this is the root page of your project, and it’s what people visit by default.

Pages can live in folders. For example:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ index.md
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  └─ index.md
└─ ...
```

With this setup, routes are served as:

```
/                → dist/index.html           → docs/index.md
/missions/       → dist/missions/index.html  → docs/missions/index.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```

As a variant of the above structure, you can move the `missions/index.md` up to a `missions.md` in the parent folder:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  ├─ missions.md
│  └─ index.md
└─ ...
```

Now routes are served as:

```
/                → dist/index.html           → docs/index.md
/missions        → dist/missions.html        → docs/missions.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```

## Content

Here are some common types of Markdown content.

### Headings

```md
# A first-level heading
## A second-level heading
### A third-level heading
```

<div class="note">A second-level heading (<code>##</code>) immediately following a first-level heading (<code>#</code>) is styled specially as a subtitle.</div>

### Styling

```md
this is **bold** text
this is __bold__ text
this is *italic* text
this is _italic_ text
this is ~~strikethrough~~ text
this is `monospaced` text
> this is quoted text
```

### Tables

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

### Lists

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

### Links

```md
<https://example.com>
[relative link](./dashboard)
[external link](https://example.com)
[external link](<https://en.wikipedia.org/wiki/Tar_(computing)>)
```

For privacy and convenience, external links are given a default `rel` attribute of [`noreferrer`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noreferrer) [`noopener`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noopener) and a default `target` attribute of [`_blank`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target). <a href="https://github.com/observablehq/framework/releases/tag/v1.5.0" class="observablehq-version-badge" data-version="^1.5.0" title="Added in 1.5.0"></a> Hence by default an external link will open in a new window and not pass the (potentially sensitive) referrer to the (potentially untrusted) external site. You can override this behavior by specifying the `rel` or `target` attribute explicitly. For example `<a href="https://example.com" target="_self">` will open in the same window, and `<a href="https://acme.com" rel="">` will allow the referrer.

### Images

```md
![A horse](./horse.jpg)
![A happy kitten](https://placekitten.com/200/300)
```

## HTML

You can also write HTML directly into Markdown. HTML is useful for greater control over layout, say to use CSS grid for a responsive bento box layout in a dashboard, or adding an external stylesheet via a link element. For example, here is an HTML details element:

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

This is **Markdown** inside of _HTML_!

  </div>
</div>

```md run=false
<div class="grid grid-cols-4">
  <div class="card">

This is **Markdown** inside of _HTML_!

  </div>
</div>
```

## Grids

The `grid` class declares a [CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) container. The `grid` class is designed to pair with the [`card` class](#card) and the [`dashboard` theme](./themes) for dashboard layout.

```html echo
<div class="grid grid-cols-4">
  <div class="card"><h1>A</h1></div>
  <div class="card"><h1>B</h1></div>
  <div class="card"><h1>C</h1></div>
  <div class="card"><h1>D</h1></div>
</div>
```

Grids have a single column by default, but you can declare two, three, or four columns using the `grid-cols-2`, `grid-cols-3`, or `grid-cols-4` class.

The built-in `grid` class is automatically responsive: in narrow windows, the number of columns is automatically reduced. The four-column grid can be reduced to two or one columns, while the three- and two-column grid can be reduced to one column. (If you want more columns or more control over the grid layout, you can always write custom styles.)

<div class="tip">To see the responsive grid layout, resize the window or collapse the sidebar on the left. You can also zoom to change the effective window size.</div>

With multi-column and multi-row grids, you can use the `grid-colspan-*` and `grid-rowspan-*` classes to have cells that span columns and rows, respectively.

```html echo
<div class="grid grid-cols-2">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card grid-rowspan-2"><h1>B</h1>1 × 2</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card grid-colspan-2"><h1>D</h1>2 × 1</div>
</div>
```

By default, the `grid` uses `grid-auto-rows: 1fr`, which means that every row of the grid has the same height. The “rhythm” of equal-height rows is often desirable.

```html echo
<div class="grid grid-cols-2">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

On the other hand, forcing all rows to the same height can waste space, since the height of all rows is based on the tallest content across rows. To have variable-height rows instead, you can either set [`grid-auto-rows`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-rows) on the grid container:

```html echo
<div class="grid grid-cols-2" style="grid-auto-rows: auto;">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

Or break your grid into multiple grids:

```html echo
<div class="grid grid-cols-2">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
</div>
<div class="grid grid-cols-2">
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

The `card` class is not required to use `grid`. If you use `grid` by itself, you’ll get the same layout but without the card aesthetics.

```html echo
<div class="grid grid-cols-2">
  <div>Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">Call me Ishmael.</div>
</div>
```

Use the `resize` helper to re-render content when the container resizes.

```html echo
<div class="grid grid-cols-4">
  <div class="card">
    ${resize((width) => `This card is ${width}px wide.`)}
  </div>
</div>
```

See [Responsive display](./javascript#responsive-display) for more.

## Cards

The `card` class is used to group and delineate content. The `card` classes applies a background and border (with colors determined by the current [theme](./themes)). A card can have a title and subtitle using <code>h2</code> and <code>h3</code> elements, respectively.

```html echo
<div class="card" style="max-width: 640px;">
  <h2>It gets hotter during summer</h2>
  <h3>And months have 28–31 days</h3>
  ${Plot.cell(weather.slice(-365), {x: (d) => d.date.getUTCDate(), y: (d) => d.date.getUTCMonth(), fill: "temp_max", tip: true, inset: 0.5}).plot({marginTop: 0, height: 240, padding: 0})}
</div>
```

<div class="tip"><a href="./lib/plot">Observable Plot</a>’s <b>title</b> and <b>subtitle</b> options generate <code>h2</code> and <code>h3</code> elements, respectively, and so will inherit these card styles.</div>

Cards can be used on their own, but they most often exist in a [grid](#grid). Cards can contain whatever you like, including text, images, charts, tables, inputs, and more.

```html echo
<div class="grid grid-cols-2">
  <div class="card">
    <h2>Lorem ipsum</h2>
    <p>Id ornare arcu odio ut sem nulla pharetra. Aliquet lectus proin nibh nisl condimentum id venenatis a. Feugiat sed lectus vestibulum mattis ullamcorper velit. Aliquet nec ullamcorper sit amet. Sit amet tellus cras adipiscing. Condimentum id venenatis a condimentum vitae. Semper eget duis at tellus. Ut faucibus pulvinar elementum integer enim.</p>
    <p>Et malesuada fames ac turpis. Integer vitae justo eget magna fermentum iaculis eu non diam. Aliquet risus feugiat in ante metus dictum at. Consectetur purus ut faucibus pulvinar.</p>
  </div>
  <div class="card" style="padding: 0;">
    ${Inputs.table(industries)}
  </div>
</div>
```

<div class="tip">Remove the padding from a card if it contains only a table.</div>

To place an input inside a card, first declare a detached input as a [top-level variable](./reactivity#top-level-variables) and use [`Generators.input`](./lib/generators#inputelement) to expose its reactive value:

```js echo
const industryInput = Inputs.select(industries.map((d) => d.industry), {unique: true, sort: true, label: "Industry:"});
const industry = Generators.input(industryInput);
```

Then, insert the input into the card:

```html echo
<div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
  ${industryInput}
  ${resize((width) => Plot.plot({
    width,
    y: {grid: true, label: "Unemployed (thousands)"},
    marks: [
      Plot.areaY(industries.filter((d) => d.industry === industry), {x: "date", y: "unemployed", fill: "var(--theme-foreground-muted)", curve: "step"}),
      Plot.lineY(industries.filter((d) => d.industry === industry), {x: "date", y: "unemployed", curve: "step"}),
      Plot.ruleY([0])
    ]
  }))}
</div>
```

## Notes

The `note`, `tip`, `warning`, and `caution` classes can be used to insert labeled notes (also known as callouts) into prose. These are intended to emphasize important information that could otherwise be overlooked.

<div class="note">This is a note.</div>

```html run=false
<div class="note">This is a note.</div>
```

<div class="tip">This is a tip.</div>

```html run=false
<div class="tip">This is a tip.</div>
```

<div class="warning">This is a warning.</div>

```html run=false
<div class="warning">This is a warning.</div>
```

<div class="caution">This is a caution.</div>

```html run=false
<div class="caution">This is a caution.</div>
```

Markdown is not supported within HTML, so if you want rich formatting or links within a note, you must write it as HTML. (In the future, we may add support for notes within Markdown.)

<div class="tip">
  <p>This is a <i>styled</i> tip using <small>HTML</small>.</p>
</div>

```html run=false
<div class="tip">
  <p>This is a <i>styled</i> tip using <small>HTML</small>.</p>
</div>
```

You can override the note’s label using the `label` attribute.

<div class="warning" label="⚠️ Danger ⚠️">No lifeguard on duty. Swim at your own risk!</div>

```html run=false
<div class="warning" label="⚠️ Danger ⚠️">No lifeguard on duty. Swim at your own risk!</div>
```

You can disable the label entirely with an empty `label` attribute.

<div class="note" label>This note has no label.</div>

```html run=false
<div class="note" label>This note has no label.</div>
```

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
