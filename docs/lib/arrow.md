# Apache Arrow

[Apache Arrow](https://arrow.apache.org/) “defines a language-independent columnar memory format for flat and hierarchical data, organized for efficient analytic operations.” You will probably not consume it directly, but it is used by [Arquero](./arquero), [DuckDB](./duckdb), and other libraries to handle data efficiently.

To load an [Arrow IPC file](https://arrow.apache.org/docs/format/Columnar.html#format-ipc), use [`FileAttachment`](../files).

```js echo
const flights = FileAttachment("flights-200k.arrow").arrow();
```

This returns a [promise](../reactivity#promises) to an [Arrow table](https://arrow.apache.org/docs/js/classes/Arrow_dom.Table.html).

```js echo
flights
```

This table records ${flights.numRows.toLocaleString("en-US")} flights. It’s easier to inspect as an array of rows:

```js echo
[...flights]
```

Or using [`Inputs.table`](../inputs/table):

```js echo
Inputs.table(flights)
```

We can visualize the distribution of flight delays with a [Plot rect mark](https://observablehq.com/plot/marks/rect) and [bin transform](https://observablehq.com/plot/transforms/bin):

```js echo
Plot.plot({
  y: {
    transform: (d) => d / 1000,
    label: "Flights (thousands)"
  },
  marks: [
    Plot.rectY(flights, Plot.binX({y: "count"}, {x: "delay", interval: 5, fill: "var(--theme-blue)"})),
    Plot.ruleY([0])
  ]
})
```

You can also work directly with the Apache Arrow API to create in-memory tables. Apache Arrow is available by default as `Arrow` in Markdown, but you can import it explicitly like so:

```js echo
import * as Arrow from "npm:apache-arrow";
```

For example, to create a table representing a year-long random walk:

```js echo
const date = d3.utcDay.range(new Date("2023-01-01"), new Date("2024-01-02"));
const random = d3.randomNormal.source(d3.randomLcg(42))(); // seeded random
const value = d3.cumsum(date, random);
const table = Arrow.tableFromArrays({date, value});
```

Visualized with [Plot’s difference mark](https://observablehq.com/plot/marks/difference):

```js echo
Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.differenceY(table, {x: "date", y: "value"})
  ]
})
```

## Apache Parquet

The [Apache Parquet](https://parquet.apache.org/) format is optimized for storage and transfer. To load a Parquet file — such as this sample of 250,000 stars from the [Gaia Star Catalog](https://observablehq.com/@cmudig/peeking-into-the-gaia-star-catalog) — use [`FileAttachment`](../files). This is implemented using Kyle Barron’s [parquet-wasm](https://kylebarron.dev/parquet-wasm/) library.

```js echo
const gaia = FileAttachment("gaia-sample.parquet").parquet();
```

Like `file.arrow`, this returns an Arrow table.

```js echo
gaia
```

```js echo
Inputs.table(gaia)
```

We can [plot](./plot) these stars binned by intervals of 2° to reveal the [Milky Way](https://en.wikipedia.org/wiki/Milky_Way).

```js echo
Plot.plot({
  aspectRatio: 1,
  marks: [
    Plot.frame({fill: 0}),
    Plot.rect(gaia, Plot.bin({fill: "count"}, {x: "ra", y: "dec", interval: 2, inset: 0}))
  ]
})
```

Parquet files work especially well with [DuckDB](./duckdb) for in-process SQL queries. The Parquet format is optimized for this use case: data is compressed in a columnar format, allowing DuckDB to load only the subset of data needed (via [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)) to execute the current query. This can give a huge performance boost when working with larger datasets.
