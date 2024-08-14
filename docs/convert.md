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

<pre><code class="language-sh">npm run observable convert <span class="win">"</span>https://observablehq.com/@d3/zoomable-sunburst</span></code></pre>

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

Framework uses vanilla [JavaScript syntax](./javascript) while notebooks use a nonstandard dialect called [Observable JavaScript](https://observablehq.com/documentation/cells/observable-javascript). A JavaScript cell in a notebook is technically not a JavaScript program (_i.e._, a sequence of statements) but rather a _cell declaration_; it can be either an _expression cell_ consisting of a single JavaScript expression (such as `1 + 2`) or a _block cell_ consisting of any number of JavaScript statements (such as `console.log("hello");`) surrounded by curly braces. These two forms of cell require slightly different treatment. The `convert` command converts both into JavaScript [fenced code blocks](./javascript#fenced-code-blocks).

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

Framework allows multiple variable declarations in the same code block, so you can coalesce multiple JavaScript cells from a notebook into a single JavaScript code block in Framework. Though note that there’s no [implicit `await`](./reactivity#promises) when referring to a variable declared in the same code block, so beware of promises.

</div>

Anonymous expression cells become expression code blocks in Framework, which work the same, so you shouldn’t have to make any changes.

```js echo
1 + 2
```

<div class="tip">

While a notebook is limited to a linear sequence of cells, Framework allows you to interpolate dynamic values anywhere on the page: consider using an [inline expression](./javascript#inline-expressions) instead of a fenced code block.

</div>

### Block cells

Block cells are used in notebooks for more elaborate definitions. They are characterized by curly braces (`{…}`) and a return statement to indicate the cell’s value. Here is an abridged typical example adapted from D3’s [_Bar chart_](https://observablehq.com/@d3/bar-chart/2):

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


To convert a named block cell to vanilla JavaScript: delete the cell name (`chart`), assignment operator (`=`), and surrounding curly braces (`{` and `}`); then replace the return statement with a variable declaration and a call to [`display`](./javascript#explicit-display) as desired.

```js run=false
const width = 960;
const height = 500;

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

const chart = display(svg.node());
```

For an anonymous block cell, omit the variable declaration. To hide the display, omit the call to `display`; you can use an [inline expression](./javascript#inline-expressions) (_e.g._, `${chart}`) to display the chart elsewhere.

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

## Imports

Notebooks often import other notebooks from Observable or open-source libraries from npm. Imports require additional manual conversion.

If the converted notebook [imports other notebooks](https://observablehq.com/documentation/notebooks/imports), you should convert the imported notebooks, too. Extract the desired JavaScript code from the imported notebooks into standard [JavaScript modules](./imports#local-imports) which you can then import in Framework.

<div class="note">

In Framework, reactivity only applies to [top-level variables](./reactivity#top-level-variables) declared in fenced code blocks. If the imported code depends on reactivity or uses [`import-with`](https://observablehq.com/documentation/notebooks/imports#import-with), you will likely need to do some additional refactoring, say converting JavaScript cells into functions that take options.

</div>

Some notebooks use [`require`](https://observablehq.com/documentation/cells/require) to load libraries from npm. Framework discourages the use of `require` and does not include built-in support for it because the asynchronous module definition (AMD) convention has been superseded by standard [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). Also, Framework preloads transitive dependencies using static analysis to improve performance, and self-hosts imports to eliminate a runtime dependency on external servers to improve security and give you control over library versioning. So this:

```js run=false
regl = require("regl")
```

Should be converted to a static [npm import](./imports#npm-imports):

```js run=false
import regl from "npm:regl";
```

<div class="tip">

The code above imports the default export from [regl](https://github.com/regl-project/regl). For other libraries, such as D3, you should use a namespace import instead:

<pre><code class="language-js">import * as d3 from "npm:d3";</code></pre>

</div>

<div class="note">

You can import [d3-require](https://github.com/d3/d3-require) if you really want to a `require` implementation; we just don’t recommend it.

</div>

Likewise, instead of `resolve` or `require.resolve`, use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve). So this:

```js run=false
require.resolve("regl")
```

Should be converted to:

```js run=false
import.meta.resolve("npm:regl")
```

Since notebooks also support [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import), you might also see libraries being loaded from CDNs such as [jsDelivr](https://www.jsdelivr.com/esm) or [esm.sh](https://esm.sh/). While you can use dynamic imports in Framework, for security and performance, we recommend also converting these into static imports. So this:

```js run=false
isoformat = import("https://esm.sh/isoformat")
```

Should be converted to:

```js run=false
import * as isoformat from "npm:isoformat";
```

<div class="tip">

If you do not want to self-host an import, say because you want the latest version of the library to update without having to rebuild your app, you can load it from an external server by providing an absolute URL:

<pre><code class="language-js">import * as isoformat from "https://esm.sh/isoformat";</code></pre>

</div>

## Generators

In notebooks, the `yield` operator turns any cell [into a generator](https://observablehq.com/documentation/cells/observable-javascript#cells-implicitly-iterate-over-generators). In vanilla JavaScript, the `yield` operator is only allowed within generator functions. Therefore in Framework you’ll need to wrap a generator cell declaration with an immediately-invoked generator function expression (IIGFE). So this:

```js run=false
foo = {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
}
```

Can be converted to:

```js run=false
const foo = (function* () {
  for (let i = 0; i < 10; ++i) {
    yield i;
  }
})();
```

<div class="note">

Since variables are evaluated lazily, the generator `foo` will only run above if it is referenced by another code block. If you want to perform asynchronous side effects, consider using an animation loop and the [invalidation promise](./reactivity#invalidation) instead of a generator.

</div>

If you need to use `await` with the generator, too, then use `async function*` to declare an async generator function instead.

## Views

In notebooks, the nonstandard [`viewof` operator](https://observablehq.com/@observablehq/views) is used to declare a reactive value that is controlled by a user interface element such as a range input. In Framework, the [`view` function](./reactivity#inputs) performs the equivalent task with vanilla syntax. So this:

```js run=false
viewof gain = Inputs.range([0, 11], {value: 5, step: 0.1, label: "Gain"})
```

Can be converted to:

```js run=false
const gain = view(Inputs.range([0, 11], {value: 5, step: 0.1, label: "Gain"}));
```

In other words: replace `viewof` with `const`, and then wrap the input declaration with a call to `view`. The `view` function both displays the given input and returns the corresponding value generator so you can define a top-level reactive value.

## Mutables

In notebooks, the nonstandard [`mutable` operator](https://observablehq.com/@observablehq/mutable) is used to declare a reactive value that can be assigned from another cell. In Framework, the [`Mutable` function](./reactivity#mutables) performs the equivalent task with vanilla syntax. So this:

```js run=false
mutable foo = 42
```

Can be converted to:

```js run=false
const foo = Mutable(42);
const setFoo = (x) => (foo.value = x);
```

Then replace any assignments to `mutable foo` with calls to `setFoo`.

## Standard library

As part of our modernization efforts with Framework, we’ve pruned deprecated methods from the standard library used in notebooks. The following built-ins are not available in Framework:

- [`DOM`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/dom/index.js)
- [`Files`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/files/index.js)
- [`Generators.disposable`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/disposable.js)
- [`Generators.filter`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/filter.js)
- [`Generators.map`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/map.js)
- [`Generators.range`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/range.js)
- [`Generators.valueAt`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/valueAt.js)
- [`Generators.worker`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/generators/worker.js)
- [`Promises`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/promises/index.js)
- [`md`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/md.js)
- [`require`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/require.js)
- [`resolve`](https://github.com/observablehq/stdlib/blob/493bf210f5fcd9360cf87a961403aa963ba08c96/src/require.js)

For convenience, we’ve linked above to the implementations so that you can see how they work, and if desired, copy the code into your own Framework app as vanilla JavaScript. For example, for a [2D canvas](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D), you can replace `DOM.context2d` with:

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

For `md`, we recommend writing literal Markdown. To parse dynamic Markdown, you can also import your preferred parser such as [markdown-it](https://github.com/markdown-it/markdown-it) from npm.

In addition to the above removals, a few of the built-in methods have changed:

- `FileAttachment` (see [below](#file-attachments))
- `Generators.input` is now an async generator
- `Generators.observe` is now an async generator
- `Generators.queue` is now an async generator
- `Mutable` (see [above](#mutables))
- `width` uses [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) instead of window _resize_ events

The Framework standard library also includes several new methods that are not available in notebooks. These are covered elsewhere: [`Generators.dark`](./lib/generators#dark) and [`dark`](./lib/generators#dark); [`Generators.now`](./lib/generators#now); [`Generators.width`](./lib/generators#width-element) and [`resize`](./javascript#resize-render); [`display`](./javascript#display-value); and [`sql`](./sql#sql-literals).

## File attachments

Framework’s [`FileAttachment`](./files) includes a few new features:

- `file.href`
- `file.lastModified`
- `file.mimeType` is always defined
- `file.text` now supports an `encoding` option
- [`file.arquero`](./lib/arquero)
- [`file.parquet`](./lib/arrow#apache-parquet)

And two removals:

- `file.csv` _etc._ treats the `typed: "auto"` option as `typed: true`
- `file.arrow` doesn’t take a `version` option

For the latter, `file.arrow` now imports `npm:apache-arrow` internally, and thus uses the same version of Arrow as if you imported Arrow directly.

## Recommended libraries

One big (but subtle) change: you can now control the version of recommended libraries, and recommended libraries are self-hosted (along with all other npm imports), and default to the latest versions. (you can still request any version explicitly by using an explicit `import … from "npm:module@version"` statement)

Upgrades (as of current writing):
- [`@duckdb/duckdb-wasm`](./lib/duckdb) from 1.24.0 to 1.28.0
- [`apache-arrow`](./lib/arrow) from 4.0.1 to 17.0.0
- [`arquero`](./lib/arquero) from 4.8.8 to 6.0.1
- [`dot`](./lib/dot) from `viz.js` 2.0.0 to `@viz-js/viz` at 3.7.0
- [`exceljs`](./lib/xlsx) from 4.3.0 to 4.4.0
- [`katex`](./lib/tex) from 0.11.0 to 0.16.11
- [`leaflet`](./lib/leaflet) from 1.9.3 to 1.9.4
- [`mermaid`](./lib/mermaid) from 9.2.2 to 10.9.1
- [`vega`](./lib/vega-lite) from 5.22.1 to 5.30.0
- [`vega-lite`](./lib/vega-lite) from 5.6.0 to 5.20.1
- [`vega-lite-api`](./lib/vega-lite) from 5.0.0 to 5.6.0

Changes:
- [`html`](./lib/htl) uses `htl.html`
- [`svg`](./lib/htl) uses `htl.svg`
- [`dot`](./lib/dot) implements responsive dark mode & styling

Additions:
- [`ReactDOM`](./jsx)
- [`React`](./jsx)
- [`duckdb`](./lib/duckdb)
- [`echarts`](./lib/echarts)
- [`mapboxgl`](./lib/mapbox-gl)
- [`vg`](./lib/mosaic)

## Sample datasets

Self-hosted.

## Cell modes

Framework doesn’t support non-code cell modes, so these features can’t be converted:

- Data table cells
- Chart cells

Framework’s SQL cell is very different from notebooks.

Some cell types cannot be converted to Observable Markdown. Data table cells can be replaced by `Inputs.table` (see [#23](https://github.com/observablehq/framework/issues/23) for future enhancements), and chart cells can be replaced by Observable Plot’s [auto mark](https://observablehq.com/plot/marks/auto).

## Databases

Database connectors can be replaced by [data loaders](./loaders).

## Secrets

We recommend using the `.env` file to store your secrets (such as database passwords and API keys) in a central place outside of your checked-in code; see [Google Analytics](https://observablehq.observablehq.cloud/framework-example-google-analytics/) for an example.
