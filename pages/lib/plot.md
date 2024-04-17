---
keywords: charts, geojson, maps
---

# Observable Plot

[Observable Plot](https://observablehq.com/plot/) is a “JavaScript library for visualizing tabular data, focused on accelerating exploratory data analysis. It has a concise, memorable, yet expressive interface, featuring scales and layered marks.” It’s the sister library to our other visualization library, [D3.js](./d3). Observable Plot is available by default as `Plot` in Markdown, but you can import it explicitly like so:

```js echo
import * as Plot from "npm:@observablehq/plot";
```

To display a chart, call `Plot.plot` or `mark.plot` like so:

```js echo
Plot.rectY(alphabet, {x: "letter", y: "frequency"}).plot()
```

As another example, here’s a pretty (but meaningless) Voronoi chart:

```js echo
const random = d3.randomLcg(42);
const x = Array.from({length: 500}, random);
const y = Array.from({length: 500}, random);
const chart = Plot.voronoi(x, {x, y, fill: x}).plot({nice: true});

display(chart);
```

To include a ${Plot.lineY([1, 2, 0, 4, 0, 3, 1, 5, 7, 2, 3]).plot({axis: null, width: 80, height: 18})} sparkline in your text — or dots ${Plot.dotX("abcdef", {r: 5, fill: Plot.identity}).plot({axis: null, width: 80, height: 12})} — say:

```md
… include a ${Plot.lineY([1, 2, 0, 4, 0, 3, 1, 5, 7, 2, 3]).plot({axis: null, width: 80, height: 18})} sparkline…
… dots ${Plot.dotX("abcdef", {r: 5, fill: Plot.identity}).plot({axis: null, width: 80, height: 12})} — say…
```
