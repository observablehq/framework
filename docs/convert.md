# Converting notebooks

Framework’s built-in `convert` command helps you convert an [Observable notebook](https://observablehq.com/documentation/notebooks/) to standard [Markdown](./markdown) for use with Observable Framework. To convert a notebook, you need its URL; pass it to the `convert` command like so:

```sh echo
npm run observable convert <notebook-url>
```

<div class="tip">

The above command assumes you’re running `convert` within an existing project. Outside of a project, you can use npx:

<pre><code class="language-sh">npx <span class="win">"</span>@observablehq/framework@latest<span class="win">"</span> convert &lt;notebook-url&gt;</code></pre>

</div>

<div class="tip">

You can convert multiple notebooks by passing multiple URLs:

<pre><code class="language-sh">npm run observable convert &lt;url1&gt; &lt;url2&gt; &lt;url3&gt;</code></pre>

</div>

<div class="note">

The `convert` command currently only supports public notebooks. To convert a private notebook, you can (temporarily) make the notebook public unlisted by clicking **Share…** on the notebook and choosing **Can view (unlisted)** under **Public** access. Please upvote [#1578](https://github.com/observablehq/framework/issues/1578) if you are interested in support for converting private notebooks.

</div>

For example, to convert D3’s [_Zoomable sunburst_](https://observablehq.com/@d3/zoomable-sunburst) example:

```sh echo
npm run observable convert https://observablehq.com/@d3/zoomable-sunburst
```

This will output something like:

<style type="text/css">

.focus {
  color: var(--theme-foreground-focus);
}

.invert {
  background-color: var(--theme-foreground-alt);
  color: var(--theme-background);
}

</style>

<pre><code><span class="muted">┌</span>  <span class="invert"> observable convert </span>
<span class="muted">│</span>
<span class="green">◇</span>  Downloaded <b>zoomable-sunburst.md</b> <span class="muted">in 443ms</span>
<span class="muted">│</span>
<span class="green">◇</span>  Downloaded <b>flare-2.json</b> <span class="muted">in 288ms</span>
<span class="muted">│</span>
<span class="muted">└</span>  1 notebook converted; 2 files written</code></pre>

The `convert` command generates files in the current working directory. The command above generates two files: <code>zoomable-sunburst.md</code>, a Markdown file representing the converted notebook; and <code>flare-2.json</code>, an attached JSON file. You can change the output directory using the <code>--output</code> command-line flag.

Due to differences between Observable Framework and Observable notebooks, the `convert` command typically won’t produce a working Markdown page out of the box; you’ll often need to make further edits to the generated Markdown. We describe these differences below, along with suggestions of how to make the remaining conversions manually.

<div class="note">

The `convert` command has minimal “magic” so that its behavior is easy to understand and because converting notebook code into standard Markdown and JavaScript requires interpretation. Still, we’re considering making `convert` smarter; let us know if you’re interested.

</div>

## JavaScript syntax

While Framework uses vanilla [JavaScript syntax](./javascript), notebooks use a nonstandard dialect called [Observable JavaScript](https://observablehq.com/documentation/cells/observable-javascript). A JavaScript cell in an notebook is not a standard JavaScript program (_i.e._, a sequence of statements), but a _cell declaration_; it can be either an _expression cell_ consisting of a single JavaScript expression (such as `1 + 2`) or a _block cell_ consisting of any number of JavaScript statements (such as `console.log("hello");`) surrounded by curly braces. These two forms of cell require slightly different treatment. The `convert` command converts both into JavaScript [fenced code blocks](./javascript#fenced-code-blocks).

### Expression cells

Named expression cells in notebooks should be converted into standard variable declarations, typically using `const`.

Before:

```js run=false
foo = 42
```

After:

```js run=false
const foo = 42;
```

<div class="tip">

Variable declarations in Framework don’t implicitly display. To inspect the value of a variable (such as `foo` above), call `display` explicitly.

</div>

<div class="tip">

Framework allows multiple variable declarations in the same code block, so you can often coalesce multiple JavaScript cells from a notebook into a single JavaScript code block in Framework. Though note that there’s no [implicit `await`](./reactivity#promises) when referring to a variable declared in the same code block, so beware of promises.

</div>

Unnamed expression cells become expression code blocks in Framework, and they work the same way, so you shouldn’t have to make any changes.

```js run=false
1 + 2
```

<div class="tip">

While a notebook is limited to a linear sequence of cells, Framework allows you to interpolate dynamic values anywhere on the page: consider using an [inline expression](./javascript#inline-expressions) instead of a fenced code block.

</div>

### Block cells

Consider a more elaborate block cell, here an abridged example of the typical D3 chart pattern (adapted from D3’s [_Bar chart_](https://observablehq.com/@d3/bar-chart/2) example):

Before:

```js run=false
chart = {
  const width = 960;
  const height = 500;

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height);

  return svg.node();
}
```

Block cells are characterized by curl braces (`{…}`) and a return statement that indicates the (displayed) value of the cell.

To convert a block cell to a JavaScript fenced code block: remove the surrounding curly braces, and replace the return statement with a variable declaration and (if desired) a call to `display`.

After:

```js run=false
const width = 960;
const height = 500;

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

const chart = display(svg.node());
```

## Import

Notebook imports _vs._ JavaScript imports _vs._ require.

Convert doesn’t convert imported notebooks. If your notebook imports cells from other notebooks, you should convert those notebooks, too, and then extract the desired JavaScript code into a standard JavaScript module that you can import.

Convert doesn’t support [`import with`](https://observablehq.com/documentation/notebooks/imports#import-with). You’ll need to redesign your code if you want to use this feature.

Dynamic imports should be converted into static imports.

Imports from a CDN should be converted into self-hosted `npm:` imports.

## Require

Framework doesn’t support `require`. You should use a static `npm:` import instead.

## Yield

Notebooks allow you to use the `yield` operator to turn any cell into a generator. As vanilla JavaScript, Framework only allows the `yield` operator within generator functions. Therefore you’ll need to wrap a generator cell with an immediately-invoked generator function expression (IIGFE).

Before:

```js run=false
foo = {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
}
```

After:

```js run=false
const foo = (function* () {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
})();
```

Framework doesn’t allow the `yield` operator outside of generators

## Viewof

…

## Mutable

…

## Standard library

Framework’s standard library is slightly different than the standard library in notebooks.

Removals:

- `md`
- `__query`
- `require`
- `resolve`
- `Promises`
- `DOM`
- `Files`
- `Generators.disposable`
- `Generators.filter`
- `Generators.map`
- `Generators.range`
- `Generators.valueAt`
- `Generators.worker`

Additions:

- `dark`
- `resize`
- `display`
- `duckdb`
- `echarts`
- `mapboxgl`
- `React`
- `ReactDOM`
- `sql`
- `vg`
- `Generators.dark`
- `Generators.now`
- `Generators.width`

Changes:

- `width` uses `ResizeObserver` instead of window _resize_ events
- `FileAttachment` is slightly different
- `Mutable` is unique to Framework
- `html` uses htl
- `svg` uses htl
- `Generators.input` is now an async generator
- `Generators.observe` is now an async generator
- `Generators.queue` is now an async generator

See also the recommended libraries section next.

## Recommended libraries

Self-hosted. You control the version. They default to the latest versions.

## Sample datasets

Self-hosted.

## Cell modes

Framework doesn’t support non-code cell modes, so these features can’t be converted:

- Data table cells
- Chart cells

Framework’s SQL cell is very different from notebooks.
