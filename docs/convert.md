# Converting notebooks

Framework’s built-in `convert` command helps you convert an [Observable notebook](https://observablehq.com/documentation/notebooks/) to standard [Markdown](./markdown) for use with Observable Framework. To convert a notebook, you just need its URL; pass it to the `convert` command like so:

```sh echo
npm run observable convert <notebook-url>
```

<div class="note">

The `convert` command currently only supports public notebooks. To convert a private notebook, you can (temporarily) make the notebook public unlisted by clicking **Share…** on the notebook and choosing **Can view (unlisted)** under **Public** access. Please upvote [#1578](https://github.com/observablehq/framework/issues/1578) if you are interested in support for converting private notebooks.

</div>

<div class="tip">

You can pass multiple URLs to convert many notebooks simultaneously.

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

The `convert` command generates files in the current working directory. The command above generates two files: <code>zoomable-sunburst.md</code>, a Markdown file representing the converted notebook; and <code>flare-2.json</code>, an attached JSON file.

## Limitations

Due to differences between Observable Framework and Observable notebooks, the `convert` command typically won’t produce a working Markdown page out of the box. You’ll need to make some further edits to the generated Markdown.

Differences between Framework and notebooks fall into three categories:

- JavaScript syntax, including imports
- the standard library
- recommended libraries

We’ll describe each of these below with examples.

### Syntax differences

While Framework uses [vanilla JavaScript](./javascript), Observable notebooks do not; notebooks use [Observable JavaScript](https://observablehq.com/documentation/cells/observable-javascript), which extends JavaScript syntax with a few critical differences. While these differences are often small, you will likely have to edit the converted code to make it conform to vanilla JavaScript syntax and work correctly in Framework.

For instance, let’s see how we fix the page converted from the [Zoomable sunburst](https://observablehq.com/@d3/zoomable-sunburst) notebook. At the bottom of the page we see that the `data` cell was transformed into:

````js run=false
```js echo
data = FileAttachment("flare-2.json").json()
```
````

Fix this with the `const` keyword:

````js run=false
```js echo
const data = FileAttachment("flare-2.json").json();
```
````

The largest code block at the top, named `chart`, contains the following:

````js run=false
```js
chart = {
  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;
  ...
  return svg.node();
}
```
````

There are various ways to make this into vanilla JavaScript. One possibility is to remove the main curly braces, like so:

````js run=false
```js
// Specify the chart’s dimensions.
const width = 928;
const height = width;
...
const chart = svg.node();
```
````

Furthermore, we’ll need to [explicitly display](./javascript#explicit-display) the `chart` variable:

````js run=false
```js
// Specify the chart’s dimensions.
const width = 928;
const height = width;
...
const chart = display(svg.node());
```
````

(An alternative transformation would be to create a function called `chart`, and invoke `chart()` as an inline expression where we want to display the output.)

Observable Markdown doesn’t support **notebook imports**. If your notebook imports cells from other notebooks, you could manually copy the code from those notebooks into your converted markdown file. If you import functions and other helpers, it could be useful to add them to a [local module](./imports#local-imports).

### Standard library differences

The `md` template literal is not available in Observable Markdown; instead, write Markdown directly (or import the `markdown-it` library from npm for advanced usage).

The `require` and `resolve` functions are not available in Observable Markdown; instead, use `import` and `import.meta.resolve`.

The `DOM.*`, `Files.*`, `Generators.*` and `Promises.*` methods are not available in Observable Markdown. Instead, use the appropriate vanilla JavaScript code — which you can grab from [observablehq/stdlib](https://github.com/observablehq/stdlib/). For example, to create an image with a [2D context](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D), you can copy the code from [context2d.js](https://github.com/observablehq/stdlib/blob/main/src/dom/context2d.js):

```js run=false
function context2d(width, height, dpi) {
  if (dpi == null) dpi = devicePixelRatio;
  var canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = width + "px";
  var context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  return context;
}
```

Or, to create a Promise that resolves to a given `value` after a given [delay](https://github.com/observablehq/stdlib/blob/main/src/promises/delay.js):

```js run=false
function delay(duration, value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(value);
    }, duration);
  });
}
```

If you use a specific function often, you can save it to a local module.

### Recommended library differences

In Observable Framework, the recommended [libraries](./imports#implicit-imports) are generally not pinned to a given version — instead you get the latest version that was published on npm (you can still request any version explicitly by using an explicit `import … from "npm:module@version"` statement). Some of them, such as [graphviz](./lib/dot), have been slightly adapted in support of dark mode. For details, see the documentation for each library.

### Other differences

Some cell types cannot be converted to Observable Markdown. Data table cells can be replaced by `Inputs.table` (see [issue #23](https://github.com/observablehq/framework/issues/23) for future enhancements), and chart cells can be replaced by Observable Plot’s [auto mark](https://observablehq.com/plot/marks/auto).

Database connectors can be replaced by [data loaders](./loaders). We recommend using the `.env` file to store your secrets (such as database passwords and API keys) in a central place outside of your checked-in code; see [Google Analytics](https://observablehq.observablehq.cloud/framework-example-google-analytics/) for an example.

## Command-line flags

The `convert` command supports the following command-line flags:

- `--output` - the path to the output directory; defaults to `.` for the current working directory.
- `--force` - if true, always download and overwrite existing resources; by default, the script will ask for user input when a file already exists in the output directory.
