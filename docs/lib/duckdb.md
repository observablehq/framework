# DuckDB

Observable Markdown has built-in support for DuckDB via [duckdb-wasm](https://github.com/duckdb/duckdb-wasm).  `DuckDBClient` is available by default in Markdown, but you can explicitly import it like so:

```js echo
import {DuckDBClient} from "npm:@observablehq/duckdb";
```

To get a DuckDB database, passing a set of named tables to `DuckDBClient.of`. Each table can be expressed as a [`FileAttachment`](../javascript/files), [Arquero table](./arquero), [Arrow table](./arrow), an array of objects, or a promise to the same:

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
  aspectRatio: 1,
  x: {domain: [0, 360]},
  y: {domain: [-90, 90]},
  marks: [
    Plot.frame({fill: 0}),
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

For externally-hosted data, you can create an empty `DuckDBClient` and load a table from a SQL query, say using [`read_parquet`](https://duckdb.org/docs/guides/import/parquet_import) or [`read_csv`](https://duckdb.org/docs/guides/import/csv_import).

```js run=false
const db = await DuckDBClient.of();

await db.sql`CREATE TABLE addresses
  AS SELECT *
  FROM read_parquet('https://static.data.gouv.fr/resources/bureaux-de-vote-et-adresses-de-leurs-electeurs/20230626-135723/table-adresses-reu.parquet')
  LIMIT 100`;
```

As an alternative to `db.sql`, there’s also `db.query`:

```js echo
await db.query("SELECT * FROM gaia LIMIT 10")
```

And `db.queryRow`:

```js echo
await db.queryRow("SELECT count() AS count FROM gaia")
```

See the [DatabaseClient Specification](https://observablehq.com/@observablehq/database-client-specification) for more details.
