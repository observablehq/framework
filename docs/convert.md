# Converting notebooks

Framework’s built-in `convert` command helps you convert an [Observable notebook](https://observablehq.com/documentation/notebooks/) to standard [Markdown](./markdown) for use with Observable Framework. To convert a notebook, you just need its URL; pass it to the `convert` command like so:

```sh echo
npm run observable convert <notebook-url>
```

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

TK Example of a `chart` cell declaration.

a) Change the `chart` cell definition to an arrow function:

```js run=false
const chart = () => {
  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;
  ...
```

b) Edit the file attachment code block like so:

````js run=false
```js
const data = FileAttachment("flare-2.json").json();
```
````

c) Add a JavaScript code block to display the chart:

````js run=false
```js
display(chart());
```
````

- It doesn't support **notebook imports**. If your notebook imports cells from other notebooks, you could manually copy the code from those notebooks into your converted markdown file.

### Standard library differences

TK

### Recommended library differences

TK

## Command-line flags

```
--output
```

```
--force
```
