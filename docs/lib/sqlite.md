# SQLite

[SQLite](https://sqlite.org/) is “a small, fast, self-contained, high-reliability, full-featured, SQL database engine” and “the most used database engine in the world.” Observable provides a ESM-compatible distribution of [sql.js](https://sql.js.org), a WASM-based distribution of SQLite. It is available by default as `SQLite` in Markdown, but you can import it like so:

```js run=false
import SQLite from "npm:@observablehq/sqlite";
```

We also provide `SQLiteDatabaseClient`, a [`DatabaseClient`](https://observablehq.com/@observablehq/database-client-specification) implementation.

```js run=false
import {SQLiteDatabaseClient} from "npm:@observablehq/sqlite";
```

The easiest way to construct a SQLite database client is to declare a [`FileAttachment`](../files) and then call `file.sqlite` to load a SQLite file. This returns a promise. (Here we rely on [implicit await](../reactivity#promises).)

```js echo
const db = FileAttachment("chinook.db").sqlite();
```

Alternatively you can use `SQLiteDatabaseClient` and pass in a string (URL), `Blob`, `ArrayBuffer`, `Uint8Array`, `FileAttachment`, or promise to the same:

```js run=false
const db = SQLiteDatabaseClient.open(FileAttachment("chinook.db"));
```

(Note that unlike [`DuckDBClient`](./duckdb), a `SQLiteDatabaseClient` takes a single argument representing _all_ of the tables in the database; that’s because a SQLite file stores multiple tables, whereas DuckDB typically uses separate Apache Parquet, CSV, or JSON files for each table.)

Using `FileAttachment` means that referenced files are automatically copied to `dist` during build, and you can even generate SQLite files using [data loaders](../data-loaders). But if you want to “hot” load a live file from an external server, pass a string to `SQLiteDatabaseClient.open`:

```js run=false
const db = SQLiteDatabaseClient.open("https://static.observableusercontent.com/files/b3711cfd9bdf50cbe4e74751164d28e907ce366cd4bf56a39a980a48fdc5f998c42a019716a8033e2b54defdd97e4a55ebe4f6464b4f0678ea0311532605a115");
```

Once you’ve loaded your `db` you can write SQL queries.

```js echo
const customers = db.sql`SELECT * FROM customers`;

display(await customers);
```

A call to `db.sql` returns a promise to an array of objects; each object represents a row returned from the query. For better readability, you can display query results using [`Inputs.table`](../inputs/table).

```js echo
Inputs.table(customers)
```

For interactive or dynamic queries, you can interpolate reactive variables into SQL queries. For example, you can declare a [text input](../inputs/text) to prompt the query to enter a search term, and then interpolate the input into the query parameter.

```js echo
const name = view(Inputs.text({label: "Name", placeholder: "Search track names"}));
```

```js echo
const tracks = db.sql`SELECT * FROM tracks WHERE Name LIKE ${`%${name}%`}`;
```

```js
Inputs.table(tracks)
```

As an alternative to `db.sql`, you can call `db.query`.

```js run=false
db.query(`SELECT * FROM tracks WHERE Name LIKE $1`, [`%${name}%`])
```

There’s also `db.queryRow` for just getting a single row.

```js echo
db.queryRow(`SELECT sqlite_version()`)
```
