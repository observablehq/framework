# DuckDB

DuckDB is “an in-process SQL OLAP Database Management System. [DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm) brings DuckDB to every browser thanks to WebAssembly.” DuckDB-Wasm is available by default as `duckdb` in Markdown, but you can explicitly import it as:

```js echo
import * as duckdb from "npm:@duckdb/duckdb-wasm";
```

For convenience, we provide a [`DatabaseClient`](https://observablehq.com/@observablehq/database-client-specification) implementation on top of DuckDB-Wasm, `DuckDBClient`. This is also available by default in Markdown, but you can explicitly import it like so:

```js echo
import {DuckDBClient} from "npm:@observablehq/duckdb";
```

To get a DuckDB client, pass zero or more named tables to `DuckDBClient.of`. Each table can be expressed as a [`FileAttachment`](../javascript/files), [Arquero table](./arquero), [Arrow table](./arrow), an array of objects, or a promise to the same. For example, below we load a sample of 250,000 stars from the [Gaia Star Catalog](https://observablehq.com/@cmudig/peeking-into-the-gaia-star-catalog) as a [Apache Parquet](https://parquet.apache.org/) file:

```js echo
const db = DuckDBClient.of({gaia: FileAttachment("gaia-sample.parquet")});
```

Now we can run a query using `db.sql` to bin the stars by [right ascension](https://en.wikipedia.org/wiki/Right_ascension) (`ra`) and [declination](https://en.wikipedia.org/wiki/Declination) (`dec`):

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

These bins can quickly be turned into a heatmap with [Plot’s raster mark](https://observablehq.com/plot/marks/raster), showing the milky way.

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
db.query("SELECT * FROM gaia LIMIT 10")
```

And `db.queryRow`:

```js echo
db.queryRow("SELECT count() AS count FROM gaia")
```

Finally, the `DuckDBClient.sql` method takes thee same arguments as `DuckDBClient.of` and returns the corresponding `db.sql` template literal, bound to the database so it be used directly:

```js echo
const sql = DuckDBClient.sql({
  quakes: d3.csv("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.csv", d3.autoType)
});
```

```js echo
[...await sql`SELECT COUNT() FROM quakes`]
```

Furthermore, when this variable is named `sql` like above, it drives the contents of [sql fenced code blocks](../sql):

```sql echo
SELECT * FROM quakes WHERE mag >= 4 ORDER BY mag DESC;
```

See the [DatabaseClient Specification](https://observablehq.com/@observablehq/database-client-specification) for more details.
