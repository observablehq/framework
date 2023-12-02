# SQLite

```js echo
SQLite
```

```js echo
SQLiteDatabaseClient
```

```js echo
// const db = SQLiteDatabaseClient.open(FileAttachment("chinook.db").url());
const db = FileAttachment("chinook.db").sqlite();
```

```js echo
const customers = db.query(`SELECT * FROM customers`);
```

```js echo
Inputs.table(customers)
```

```js echo
const term = view(Inputs.text({label: "Term"}));
```

```js echo
const tracks = db.sql`SELECT * FROM tracks WHERE Composer LIKE ${`%${term}%`}`;
```

```js run=false
const tracks = db.query(`SELECT * FROM tracks WHERE Composer LIKE $1`, [`%${term}%`]);
```

```js echo
Inputs.table(tracks)
```

```js echo
await db.queryRow(`SELECT sqlite_version()`)
```
