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

To get a DuckDB client, pass zero or more named tables to `DuckDBClient.of`. Each table can be expressed as a [`FileAttachment`](../files), [Arquero table](./arquero), [Arrow table](./arrow), an array of objects, or a promise to the same. For file attachments, the following formats are supported: [CSV](./csv), [TSV](./csv), [JSON](../files#json), [Apache Arrow](./arrow), and [Apache Parquet](./arrow#apache-parquet). For example, below we load a sample of 250,000 stars from the [Gaia Star Catalog](https://observablehq.com/@cmudig/peeking-into-the-gaia-star-catalog) as a Parquet file:

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

For externally-hosted data, you can create an empty `DuckDBClient` and load a table from a SQL query, say using [`read_parquet`](https://duckdb.org/docs/guides/import/parquet_import) or [`read_csv`](https://duckdb.org/docs/guides/import/csv_import). DuckDB offers many affordances to make this easier. (In many cases it detects the file format and uses the correct loader automatically.)

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

## Custom setup

The `DuckDBClient.sql` method <a href="https://github.com/observablehq/framework/releases/tag/v1.4.0" class="observablehq-version-badge" data-version="^1.4.0" title="Added in 1.4.0"></a> takes the same arguments as `DuckDBClient.of` and returns the corresponding `db.sql` tagged template literal.

The returned function can be used to redefine the built-in [`sql` tagged template literal](../sql#sql-literals) and thereby change the database used by [SQL code blocks](../sql), allowing you to query dynamically-registered tables (unlike the **sql** front matter option).

```js
const feed = view(Inputs.select(new Map([["M4.5+", "4.5"], ["M2.5+", "2.5"], ["All", "all"]]), {label: "Earthquake feed"}));
```

```js echo
const sql = DuckDBClient.sql({quakes: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}_day.csv`});
```

```sql echo
SELECT * FROM quakes ORDER BY updated DESC;
```

The definition above is shorthand for:

```js run=false
const db = await DuckDBClient.of({quakes: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}_day.csv`});
const sql = db.sql.bind(db);
```

## Extensions <a href="https://github.com/observablehq/framework/releases/tag/v1.13.0" class="observablehq-version-badge" data-version="^1.13.0" title="Added in 1.13.0"></a>

[DuckDB extensions](https://duckdb.org/docs/extensions/overview.html) extend DuckDB’s functionality, adding support for additional file formats, new types, and domain-specific functions. For example, the [`json` extension](https://duckdb.org/docs/data/json/overview.html) provides a `read_json` method for reading JSON files:

```sql echo
SELECT bbox FROM read_json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
```

To read a local file (or data loader), use `FileAttachment` and interpolation `${…}`:

```sql echo
SELECT bbox FROM read_json(${FileAttachment("../quakes.json").href});
```

For convenience, Framework configures the `json` and `parquet` extensions by default. Some other [core extensions](https://duckdb.org/docs/extensions/core_extensions.html) also autoload, meaning that you don’t need to explicitly enable them; however, Framework will only [self-host extensions](#self-hosting-of-extensions) if you explicitly configure them, and therefore we recommend that you always use the [**duckdb** config option](../config#duckdb) to configure DuckDB extensions. Any configured extensions will be automatically [installed and loaded](https://duckdb.org/docs/extensions/overview#explicit-install-and-load), making them available in SQL code blocks as well as the `sql` and `DuckDBClient` built-ins.

For example, to configure the [`spatial` extension](https://duckdb.org/docs/extensions/spatial/overview.html):

```js run=false
export default {
  duckdb: {
    extensions: ["spatial"]
  }
};
```

You can then use the `ST_Area` function to compute the area of a polygon:

```sql echo run=false
SELECT ST_Area('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'::GEOMETRY) as area;
```

To tell which extensions have been loaded, you can run the following query:

```sql
FROM duckdb_extensions() WHERE loaded AND JSON '1';
```

```sql run=false
FROM duckdb_extensions() WHERE loaded;
```

<div class="warning">

If the `duckdb_extensions()` function runs before DuckDB autoloads a core extension (such as `json`), it might not be included in the returned set.

</div>

### Self-hosting of extensions

As with [npm imports](../imports#self-hosting-of-npm-imports), configured DuckDB extensions are self-hosted, improving performance, stability, & security, and allowing you to develop offline. Extensions are downloaded to the DuckDB cache folder, which lives in <code>.observablehq/<wbr>cache/<wbr>\_duckdb</code> within the source root (typically `src`). You can clear the cache and restart the preview server to re-fetch the latest versions of any DuckDB extensions. If you use an [autoloading core extension](https://duckdb.org/docs/extensions/core_extensions.html#list-of-core-extensions) that is not configured, DuckDB-Wasm [will load it](https://duckdb.org/docs/api/wasm/extensions.html#fetching-duckdb-wasm-extensions) from the default extension repository, `extensions.duckdb.org`, at runtime.

## Configuring

The second argument to `DuckDBClient.of` and `DuckDBClient.sql` is a [`DuckDBConfig`](https://shell.duckdb.org/docs/interfaces/index.DuckDBConfig.html) object which configures the behavior of DuckDB-Wasm. By default, Framework sets the `castBigIntToDouble` and `castTimestampToDate` query options to true. To instead use [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt):

```js run=false
const bigdb = DuckDBClient.of({}, {query: {castBigIntToDouble: false}});
```

By default, `DuckDBClient.of` and `DuckDBClient.sql` automatically load all [configured extensions](#extensions). To change the loaded extensions for a particular `DuckDBClient`, use the **extensions** config option. For example, pass an empty array to instantiate a DuckDBClient with no loaded extensions (even if your configuration lists several):

```js echo run=false
const simpledb = DuckDBClient.of({}, {extensions: []});
```

Alternatively, you can configure extensions to be self-hosted but not load by default using the **duckdb** config option and the `load: false` shorthand:

```js run=false
export default {
  duckdb: {
    extensions: {
      spatial: false,
      h3: false
    }
  }
};
```

You can then selectively load extensions as needed like so:

```js echo run=false
const geosql = DuckDBClient.sql({}, {extensions: ["spatial", "h3"]});
```

In the future, we’d like to allow DuckDB to be configured globally (beyond just [extensions](#extensions)) via the [**duckdb** config option](../config#duckdb); please upvote [#1791](https://github.com/observablehq/framework/issues/1791) if you are interested in this feature.

## Versioning

Framework currently uses [DuckDB-Wasm 1.29.0](https://github.com/duckdb/duckdb-wasm/releases/tag/v1.29.0) <a href="https://github.com/observablehq/framework/releases/tag/v1.13.0" class="observablehq-version-badge" data-version="^1.13.0" title="Added in 1.13.0"></a>, which aligns with [DuckDB 1.1.1](https://github.com/duckdb/duckdb/releases/tag/v1.1.1). You can load a different version of DuckDB-Wasm by importing `npm:@duckdb/duckdb-wasm` directly, for example:

```js run=false
import * as duckdb from "npm:@duckdb/duckdb-wasm@1.28.0";
```

However, you will not be able to change the version of DuckDB-Wasm used by SQL code blocks or the `sql` or `DuckDBClient` built-ins, nor can you use Framework’s support for self-hosting extensions with a different version of DuckDB-Wasm.
