# Convert Arrow files to parquet

A simple app that converts your arrow files to the parquet format, using DuckDB-wasm under the hood.

```js
const file = view(Inputs.file());
```

```js
const table = file?.name.replace(".arrow", "");
```

```js
const db = file && DuckDBClient.of({[table]: file});
```

```js
display(file
  ? html`<button onclick=${async function() {
    this.disabled = true;
    download(await toParquet(db, {table}));
    this.disabled = false;
    }}>Download ${table}.parquet`
  : html`<button disabled>…`
);
```

```js
// Exports a DuckDB table to parquet.
async function toParquet(duckDbClient, {table = "data", name = `${table}.parquet`} = {}) {
  const tmp = (Math.random()*1e16).toString(16);
  const db = duckDbClient._db;
  // https://duckdb.org/docs/sql/statements/copy
  console.log("start COPY", {table, name, tmp});
  await duckDbClient.query(`COPY ${duckDbClient.escape(table)} TO '${tmp}' (FORMAT PARQUET, COMPRESSION GZIP)`);
  console.log("start copyFileToBuffer");
  const buffer = await db.copyFileToBuffer(tmp);
  //db.dropFile(tmp);

  return new File([buffer], name, {
    // https://issues.apache.org/jira/browse/PARQUET-1889
    type: "application/vnd.apache.parquet"
  });
}

// Triggers a download. Needs to be invoked via a user input.
function download(file) {
  const a = document.createElement("a");
  a.download = file.name;
  a.href = URL.createObjectURL(file);
  a.click();
  URL.revokeObjectURL(a.href);
}
```

<div style="height: 40vh"></div>

