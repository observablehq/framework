# Observable Plot

[Observable Plot](https://observablehq.com/plot/) is a JavaScript library for exploratory data visualization, made by the same team as [D3](d3). Plot is available by default as `Plot` in Markdown, but you can import it explicitly like so:

```js echo
import * as Plot from "npm:@observablehq/plot";
```

To display a chart in Observable Markdown, simply call `Plot.plot` in a JavaScript expression code block:

````md
```js
Plot.plot({
  marks: [
    Plot.barY(alphabet, {x: "letter", y: "frequency"})
  ]
})
```
````

For example, here’s a Voronoi chart:

```js echo
const random = d3.randomLcg(42);
const chart = Plot.voronoi(Array.from({length: 100}, () => [random(), random()])).plot({nice: true}); 

display(chart);
```

Or, to include a ${Plot.lineY([1, 2, 0, 4, 0, 3, 1, 5, 7, 2, 3]).plot({axis: null, width: 80, height: 18})} sparkline in your text — or bars ${Plot.barY([1, 2, 4, 3, 1, 5], {fill: Plot.identity}).plot({axis: null, width: 80, height: 18})} — just call:

```md
… include a ${Plot.lineY([1, 2, 0, 4, 0, 3, 1, 5, 7, 2, 3]).plot({axis: null, width: 80, height: 18})} sparkline…
… bars ${Plot.lineY([1, 2, 4, 3, 1, 5], {fill: Plot.identity}).plot({axis: null, width: 80, height: 18})} — just…
```