# DuckDB

<div class="tip">The most convenient way to use DuckDB in Observable is the built-in <a href="../sql">SQL code blocks</a> and <a href="../sql#sql-literals"><code>sql</code> tagged template literal</a>. Use <code>DuckDBClient</code> or DuckDB-Wasm directly, as shown here, if you need greater control.</div>

DuckDB is “an in-process SQL OLAP Database Management System. [DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm) brings DuckDB to every browser thanks to WebAssembly.” DuckDB-Wasm is available by default as `duckdb` in Markdown, but you can explicitly import it as:

```js echo
import * as duckdb from "npm:@duckdb/duckdb-wasm";
```

For convenience, we provide a [`DatabaseClient`](https://observablehq.com/@observablehq/database-client-specification) implementation on top of DuckDB-Wasm, `DuckDBClient`. This is also available by default in Markdown, but you can explicitly import it like so:

```js echo
import {DuckDBClient} from "npm:@observablehq/duckdb";
```

To get a DuckDB client, pass zero or more named tables to `DuckDBClient.of`. Each table can be expressed as a [`FileAttachment`](../files), [Arquero table](./arquero), [Arrow table](./arrow), an array of objects, or a promise to the same. For file attachments, the following formats are supported: [CSV](./csv), [TSV](./csv), [JSON](./files#json), [Apache Arrow](./arrow), and [Apache Parquet](./arrow#apache-parquet). For example, below we load a sample of 250,000 stars from the [Gaia Star Catalog](https://observablehq.com/@cmudig/peeking-into-the-gaia-star-catalog) as a Parquet file:

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

You can also [attach](https://duckdb.org/docs/sql/statements/attach) a complete database saved as DuckDB file, <a href="https://github.com/observablehq/framework/releases/tag/v1.4.0" class="observablehq-version-badge" data-version="^1.4.0" title="Added in 1.4.0"></a> typically using the `.db` file extension (or `.ddb` or `.duckdb`). In this case, the associated name (below `base`) is a _schema_ name rather than a _table_ name.

```js echo
const db2 = await DuckDBClient.of({base: FileAttachment("quakes.db")});
```

```js echo
db2.queryRow(`SELECT COUNT() FROM base.events`)
```

For externally-hosted data, you can create an empty `DuckDBClient` and load a table from a SQL query, say using [`read_parquet`](https://duckdb.org/docs/guides/import/parquet_import) or [`read_csv`](https://duckdb.org/docs/guides/import/csv_import). DuckDB offers many affordances to make this easier (in many cases it detects the file format and uses the correct loader automatically).

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

<div class="note">The <code>db.sql</code> and <code>db.query</code> methods return a promise to an <a href="./arrow">Arrow table</a>. This columnar representation is much more efficient than an array-of-objects. You can inspect the contents of an Arrow table using <a href="../inputs/table"><code>Inputs.table</code></a> and pass the data to <a href="./plot">Plot</a>.</div>

And `db.queryRow`:

```js echo
db.queryRow("SELECT count() AS count FROM gaia")
```

See the [DatabaseClient Specification](https://observablehq.com/@observablehq/database-client-specification) for more details on these methods.

Finally, the `DuckDBClient.sql` method <a href="https://github.com/observablehq/framework/releases/tag/v1.4.0" class="observablehq-version-badge" data-version="^1.4.0" title="Added in 1.4.0"></a> takes the same arguments as `DuckDBClient.of` and returns the corresponding `db.sql` tagged template literal. The returned function can be used to redefine the built-in [`sql` tagged template literal](../sql#sql-literals) and thereby change the database used by [SQL code blocks](../sql), allowing you to query dynamically-registered tables (unlike the **sql** front matter option).

```js
const feed = view(Inputs.select(new Map([["M4.5+", "4.5"], ["M2.5+", "2.5"], ["All", "all"]]), {label: "Earthquake feed"}));
```

```js echo
const sql = DuckDBClient.sql({quakes: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}_day.csv`});
```

```sql echo
SELECT * FROM quakes ORDER BY updated DESC;
```
