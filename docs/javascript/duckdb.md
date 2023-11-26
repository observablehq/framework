# DuckDB

Observable Markdown has built-in support for DuckDB via [duckdb-wasm](https://github.com/duckdb/duckdb-wasm). It’s easiest to use in conjunction with [`FileAttachment`](./files). Declare a database with `DuckDBClient`, passing in a set of named tables:

```js echo
const db = DuckDBClient.of({gaia: FileAttachment("gaia-sample.parquet")});
```

You can run a query using `db.sql`:

```js echo
const bins = db.sql`SELECT
  floor(ra / 2) * 2 + 1 AS ra,
  floor(dec / 2) * 2 + 1 AS dec,
  count() AS count
FROM
  gaia
GROUP BY
  1,
  2`
```

Now let’s make a chart with [Plot’s raster mark](https://observablehq.com/plot/marks/raster).

```js echo
Plot.plot({
  x: {domain: [0, 360]},
  y: {domain: [-90, 90]},
  marks: [
    Plot.raster(bins, {
      x: "ra",
      y: "dec",
      fill: "count",
      width: 360 / 2,
      height: 180 / 2,
      imageRendering: "pixelated"
    })
  ]
})
```

There’s also `db.query`:

```js echo
await db.query("SELECT * FROM gaia LIMIT 10")
```

And `db.queryRow`:

```js echo
await db.queryRow("SELECT count() AS count FROM gaia")
```

See the [DatabaseClient Specification](https://observablehq.com/@observablehq/database-client-specification) for more details.
