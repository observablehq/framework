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

For example, to convert D3’s [_Zoomable sunburst_](https://observablehq.com/@d3/zoomable-sunburst):

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

Due to differences between Observable Framework and Observable notebooks, the `convert` command typically won’t produce a working Markdown page out of the box; you’ll often need to make further edits to the generated Markdown. We describe these differences below, along with examples of manual conversion.

<div class="note">

The `convert` command has minimal “magic” so that its behavior is easier to understand and because converting notebook code into standard Markdown and JavaScript requires human interpretation. Still, we’re considering making `convert` smarter; let us know if you’re interested.

</div>

## JavaScript syntax

Framework uses vanilla [JavaScript syntax](./javascript) while notebooks use a nonstandard dialect called [Observable JavaScript](https://observablehq.com/documentation/cells/observable-javascript). A JavaScript cell in an notebook is not a JavaScript program (_i.e._, a sequence of statements) but rather a _cell declaration_; it can be either an _expression cell_ consisting of a single JavaScript expression (such as `1 + 2`) or a _block cell_ consisting of any number of JavaScript statements (such as `console.log("hello");`) surrounded by curly braces. These two forms of cell require slightly different treatment. The `convert` command converts both into JavaScript [fenced code blocks](./javascript#fenced-code-blocks).

### Expression cells

Named expression cells in notebooks can be converted into standard variable declarations, typically using `const`. So this:

```js run=false
foo = 42
```

Becomes this:

```js run=false
const foo = 42;
```

<div class="tip">

Variable declarations in Framework don’t implicitly display. To inspect the value of a variable (such as `foo` above), call `display` explicitly.

</div>

<div class="tip">

Framework allows multiple variable declarations in the same code block, so you can often coalesce multiple JavaScript cells from a notebook into a single JavaScript code block in Framework. Though note that there’s no [implicit `await`](./reactivity#promises) when referring to a variable declared in the same code block, so beware of promises.

</div>

Anonymous expression cells become expression code blocks in Framework, which work the same, so you shouldn’t have to make any changes.

```js run=false
1 + 2
```

<div class="tip">

While a notebook is limited to a linear sequence of cells, Framework allows you to interpolate dynamic values anywhere on the page: consider using an [inline expression](./javascript#inline-expressions) instead of a fenced code block.

</div>

### Block cells

Block cells are typically used for more elaborate definitions. They are characterized by curly braces (`{…}`) and a return statement to indicate the cell’s value. Here is an abridged typical example adapted from D3’s [_Bar chart_](https://observablehq.com/@d3/bar-chart/2):

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


To convert a named block cell: delete the cell name (`chart`), assignment operator (`=`), and surrounding curly braces (`{` and `}`); then replace the return statement with a variable declaration and a call to [`display`](./javascript#explicit-display) as desired.

```js run=false
const width = 960;
const height = 500;

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

const chart = display(svg.node());
```

For an anonymous block cell, omit the variable declaration. To display nothing, omit the call to `display`; you can use an [inline expression](./javascript#inline-expressions) (_e.g._, `${chart}`) to display the chart elsewhere.

<div class="tip">

If you prefer, you can instead convert a block cell into a function such as:

<pre><code class="language-js">function chart() {
  const width = 960;
  const height = 500;

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height);

  return svg.node();
}</code></pre>

Then call the function from an inline expression (_e.g._, `${chart()}`) to display its output anywhere on the page. This technique is also useful for importing a chart definition into multiple pages.

</div>

## Import

Notebook imports _vs._ JavaScript imports _vs._ require.

Convert doesn’t convert imported notebooks. If your notebook imports cells from other notebooks, you should convert those notebooks, too, and then extract the desired JavaScript code into a standard [JavaScript module](./imports#local-imports) that you can import.

Convert doesn’t support [`import with`](https://observablehq.com/documentation/notebooks/imports#import-with). You’ll need to redesign your code if you want to use this feature.

Dynamic imports should be converted into static imports.

Imports from a CDN should be converted into self-hosted `npm:` imports.

Framework doesn’t include built-in support for `require` because the asynchronous module definition (AMD) convention has been superseded by standard [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). You should use a static `npm:` import instead. That said, you can import [d3-require](https://github.com/d3/d3-require) if you want to a `require` implementation; we just don’t recommend it. And instead of `resolve`, use `import.meta.resolve`.

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

[./reactivity#inputs](./reactivity#inputs)

## Mutable

[./reactivity#mutables](./reactivity#mutables)

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

The `md` template literal is not available in Observable Markdown; instead, write Markdown directly (or import the `markdown-it` library from npm for advanced usage).

For removed methods, you’ll need to provide your own implementation in vanilla JavaScript. If you like, you can refer to the source code from the notebook implementations in the [@observablehq/stdlib repo](https://github.com/observablehq/stdlib/). For example, to create an image with a [2D context](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D), you can copy the code from [context2d.js](https://github.com/observablehq/stdlib/blob/main/src/dom/context2d.js):

```js run=false
function context2d(width, height, dpi = devicePixelRatio) {
  const canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style = `width: ${width}px;`;
  const context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  return context;
}
```

To create a Promise that resolves after a given delay ([`Promises.delay`](https://github.com/observablehq/stdlib/blob/main/src/promises/delay.js)):

```js run=false
function delay(duration, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), duration);
  });
}
```

If you use a specific function often, you can save it to a local module.

## File attachments

Additions:

- `file.href`
- `file.lastModified`
- `file.arquero`
- `file.parquet`

Changes:

- `file.csv` _etc._ don’t support `typed: "auto"` (only `typed: true`)
- `file.text` supports `encoding` option
- `file.arrow` doesn’t take a version and instead whatever `npm:apache-arrow` is
- `file.mimeType` is always defined

## Recommended libraries

Self-hosted. You control the version. They default to the latest versions.

In Observable Framework, the recommended [libraries](./imports#implicit-imports) are generally not pinned to a given version — instead you get the latest version that was published on npm (you can still request any version explicitly by using an explicit `import … from "npm:module@version"` statement). Some of them, such as [graphviz](./lib/dot), have been slightly adapted in support of dark mode. For details, see the documentation for each library.

## Sample datasets

Self-hosted.

## Cell modes

Framework doesn’t support non-code cell modes, so these features can’t be converted:

- Data table cells
- Chart cells

Framework’s SQL cell is very different from notebooks.

Some cell types cannot be converted to Observable Markdown. Data table cells can be replaced by `Inputs.table` (see [issue #23](https://github.com/observablehq/framework/issues/23) for future enhancements), and chart cells can be replaced by Observable Plot’s [auto mark](https://observablehq.com/plot/marks/auto).

## Databases

Database connectors can be replaced by [data loaders](./loaders).

## Secrets

We recommend using the `.env` file to store your secrets (such as database passwords and API keys) in a central place outside of your checked-in code; see [Google Analytics](https://observablehq.observablehq.cloud/framework-example-google-analytics/) for an example.
