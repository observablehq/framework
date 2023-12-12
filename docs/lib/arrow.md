# Apache Arrow

[Apache Arrow](https://arrow.apache.org/) “defines a language-independent columnar memory format for flat and hierarchical data, organized for efficient analytic operations.” You will probably not consume it directly, but it is used by [Arquero](arquero), [DuckDB](duckdb), and other libraries to handle data efficiently. Apache Arrow is available by default as `Arrow` in Markdown, but you can import it explicitly like so:

```js echo
import * as Arrow from "npm:apache-arrow";
```

For example, let’s create a table representing a year’s worth of random walk:

```js echo
const date = d3.utcDay.range(new Date("2023-01-01"), new Date("2024-01-02"));
const random = d3.randomNormal.source(d3.randomLcg(42))(); // seeded random
const value = d3.cumsum(date, random);
const table = Arrow.tableFromArrays({date, value});
```

Now we can visualize it with [Observable Plot](./plot):

```js echo
Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(table, {x: "date", y: "value"})
  ]
})
```

We can also inspect the Arrow table object directly:

```js echo
table
```

Though, it’s at little easier to see as an array of objects:

```js echo
[...table]
```

Or using [Inputs.table](./inputs#table):

```js echo
Inputs.table(table)
```

More commonly you might use an Apache Parquet file. We use [parquet-wasm](https://kylebarron.dev/parquet-wasm/).

```js echo
const schools = FileAttachment("schools.parquet").parquet();
```

```js echo
Plot.plot({
  projection: "albers-usa",
  marks: [
    Plot.dot(schools, {x: "LONGITUD", y: "LATITUDE"})
  ]
})
```
