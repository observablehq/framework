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

### Parquet

The [Apache Parquet](https://parquet.apache.org/) format is optimized for storage and transfer. To load a Parquet file into memory, such as this data frame of the right ascension and declination of a sample of 250,000 stars from the [Gaia Star Catalog](https://observablehq.com/@cmudig/peeking-into-the-gaia-star-catalog):

```js echo
const gaia = FileAttachment("../data/gaia-sample.parquet").parquet();
```

We can then [plot](../lib/plot) these stars (binned by intervals of 5°), and reveal the milky way.

```js echo
Plot.plot({
  aspectRatio: 1,
  color: {type: "log", scheme: "blues"},
  marks: [
    Plot.frame({fill: "#fff"}),
    Plot.rect(gaia, Plot.bin({fill: "count"}, {x: "ra", y: "dec", interval: 5, inset: 0}))
  ]
})
```

This method uses [parquet-wasm](https://kylebarron.dev/parquet-wasm/).

Another common way to consume Parquet files is to run SQL queries on them with the [DuckDB](../lib/duckdb) database engine (see that page for a different take on the milky way!). The parquet format is optimized for this use case: the data being compressed and organized by column, DuckDB does not have to load all the data if the query only necessitates an index and a column. This can give a huge performance boost when working with large data files in interactive pages.

### Arrow

[Arrow](https://arrow.apache.org/) is the pendant of the Parquet format once the data is loaded into memory. It is used by [Arquero](../lib/arquero), [DuckDB](../lib/duckdb), and other libraries, to handle data efficiently.

Though you will rarely have to consume this format directly, it is sometimes saved to disk as .arrow files, which you can load with `file.arrow()`.

The Arrow format supports different versions (namely: 4, 9 and 11), which you can specify like so:

```js echo
const flights = await FileAttachment("../data/flights-200k.arrow").arrow({version: 9});
display(flights);
```

The file above contains 231,083 flight records, which we can explore with [Observable Plot](../lib/plot):

```js echo
Plot.plot({
  height: 120,
  marginLeft: 60,
  marks: [
    Plot.ruleY([0]),
    Plot.rectY(flights, Plot.binX({y: "count"}, {x: "delay", interval: 5, fill: "steelblue"}))
  ]
})
```

The [Arrow](../lib/arrow) page shows how to use the arrow format to work with data frames.
