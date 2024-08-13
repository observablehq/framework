# Converting notebooks

To help you convert a public Observable notebook to Observable Markdown, Framework includes the `observable convert` utility. Just run:

```sh echo
npm run observable convert <notebook url>
```

Or with Yarn:

```sh echo
yarn observable convert <notebook url>
```

Note that, due to [syntax differences](./javascript) between notebooks and Framework, the resulting page may require further changes to function correctly. 

## Example

For example, to convert the notebook at [`https://observablehq.com/@d3/zoomable-sunburst`](https://observablehq.com/@d3/zoomable-sunburst) to Observable Markdown, run the following command in the project directory:

```sh echo
npm run observable convert https://observablehq.com/@d3/zoomable-sunburst
```

This creates two files: `zoomable-sunburst.md` (combining Markdown and JavaScript) and `flare-2.json` (data). Move them to your documents folder (_e.g._, `src/`), then [preview](./getting-started#test-live-preview) the page (typically at [`http://127.0.0.1:3000/zoomable-sunburst`](http://127.0.0.1:3000/zoomable-sunburst)). You should see a few errors that need to be corrected:

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

## Things to note

- The `convert` utility only works with **public notebooks** at this point. We may add support for private notebooks in the future.
- It doesn't support **notebook imports**. If your notebook imports cells from other notebooks, you could manually copy the code from those notebooks into your converted markdown file.
- No support for **Observable JavaScript syntax**. You will need to adjust the code to work with [Framework's JavaScript syntax](/javascript).
- **Reactivity** works slightly differently in Framework. For example, instead of using `viewof` with the Inputs library, you use `view`. See the [Reactivity](/reactivity) section for more details.
- Framework uses a slightly different **Standard Library** than notebooks. You may need to adjust the code to work with Framework's Standard Library.
