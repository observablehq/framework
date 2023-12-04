# SQLite

[SQLite](https://sqlite.org/) is “a small, fast, self-contained, high-reliability, full-featured, SQL database engine” and “the most used database engine in the world.” We provide built-in support for [sql.js](https://sql.js.org), a WASM-based distribution of SQLite.

```js echo
import SQLite from "npm:@observablehq/sqlite";
```

We also provide a `sql` template literal implementation using `SQLiteDatabaseClient`.

```js echo
import {SQLiteDatabaseClient} from "npm:@observablehq/sqlite";
```

(Both of these are available by default in [Observable Markdown](../markdown) but are not loaded unless you reference them.)

The easiest way to construct a `SQLiteDatabaseClient` is to call `file.sqlite()` to load a SQLite database file. This returns a promise. (Here we rely on [implicit await](../javascript/promises).)

```js echo
const db = FileAttachment("chinook.db").sqlite();
```

Alternatively you can use `SQLiteDatabaseClient` and pass in a string (URL), `Blob`, `ArrayBuffer`, `Uint8Array`, `FileAttachment`, or promise to the same:

```js run=false
const db = SQLiteDatabaseClient.open(FileAttachment("chinook.db"));
```

We recommend using `FileAttachment` for local files so that the files are automatically copied to `dist` during build, and so you can generate SQLite files using [data loaders](../loaders). But if you want to “hot” load a live file from an external server (not generally recommended since it’s usually slower and less reliable than a data loader), pass a string to `SQLiteDatabaseClient.open`.

```js run=false
const db = SQLiteDatabaseClient.open("https://static.observableusercontent.com/files/b3711cfd9bdf50cbe4e74751164d28e907ce366cd4bf56a39a980a48fdc5f998c42a019716a8033e2b54defdd97e4a55ebe4f6464b4f0678ea0311532605a115");
```

Once you’ve loaded your `db` you can write SQL queries.

```js echo
const customers = db.sql`SELECT * FROM customers`;
```

```js
customers
```

This returns a promise to an array of objects; each object represents a row returned from the query.

For better readability, you can display query result sets using [Inputs.table](./inputs#table).

```js echo
Inputs.table(customers)
```

For interactive or dynamic queries, you can interpolate reactive variables into SQL queries. For example, you can declare a [text input](./inputs#text) to prompt the query to enter a search term, and then interpolate the input into the query parameter.

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
await db.query(`SELECT * FROM tracks WHERE Name LIKE $1`, [`%${name}%`])
```

There’s also `db.queryRow` for just getting a single row.

```js echo
await db.queryRow(`SELECT sqlite_version()`)
```
