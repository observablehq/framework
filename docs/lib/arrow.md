# Apache Arrow

[Apache Arrow](https://arrow.apache.org/) defines a language-independent columnar memory format for flat and hierarchical data, organized for efficient analytic operations. You will probably not consume it directly, but it is used by [arquero](arquero), [DuckDB](duckdb), etc., to handle data efficiently.

The library (currently version ${(await FileAttachment("versions.json").json()).arrow}) is available by default as `Arrow` in Markdown, but you can import it explicitly like so:

```js echo
import * as Arrow from "npm:apache-arrow";
```

For example, let’s create a table representing a year’s worth of random walk:

```js echo
const date = d3.utcDay.range(new Date("2023-01-01"), new Date("2024-01-02"));
const random = d3.randomNormal.source(d3.randomLcg(42))(); // seeded random
const value = d3.cumsum(date, random);
const table = Arrow.tableFromArrays({date, value});
display([...table]);
```

```js echo
display(Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(table, {x: "date", y: "value"})
  ]
}));
```
