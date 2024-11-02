/* global DUCKDB_MANIFEST */
import * as duckdb from "npm:@duckdb/duckdb-wasm";

// Adapted from https://observablehq.com/@cmudig/duckdb-client
// Copyright 2021 CMU Data Interaction Group
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors
//    may be used to endorse or promote products derived from this software
//    without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

const bundles = {
  mvp: DUCKDB_MANIFEST.platforms.mvp
    ? {
        mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm"),
        mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js")
      }
    : undefined,
  eh: DUCKDB_MANIFEST.platforms.eh
    ? {
        mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm"),
        mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js")
      }
    : undefined
};
const bundle = duckdb.selectBundle(bundles);
const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);

let db;
let inserts = [];
const sources = new Map();

export function registerTable(name, source) {
  if (source == null) {
    sources.delete(name);
    db = DuckDBClient.of(); // drop existing tables and views before re-inserting
    inserts = Array.from(sources, (i) => db.then((db) => insertSource(db._db, ...i)));
  } else {
    sources.set(name, source);
    db ??= DuckDBClient.of(); // lazy instantiation
    inserts.push(db.then((db) => insertSource(db._db, name, source)));
  }
}

export async function sql(strings, ...args) {
  return (await getDefaultClient()).query(strings.join("?"), args);
}

export async function getDefaultClient() {
  await Promise.all(inserts);
  return await (db ??= DuckDBClient.of());
}

export class DuckDBClient {
  constructor(db) {
    Object.defineProperties(this, {
      _db: {value: db}
    });
  }

  async queryStream(query, params) {
    const connection = await this._db.connect();
    let reader, batch;
    try {
      if (params?.length > 0) {
        const statement = await connection.prepare(query);
        reader = await statement.send(...params);
      } else {
        reader = await connection.send(query);
      }
      batch = await reader.next();
      if (batch.done) throw new Error("missing first batch");
    } catch (error) {
      await connection.close();
      throw error;
    }
    return {
      schema: batch.value.schema,
      async *readRows() {
        try {
          while (!batch.done) {
            yield batch.value.toArray();
            batch = await reader.next();
          }
        } finally {
          await connection.close();
        }
      }
    };
  }

  async query(query, params) {
    const connection = await this._db.connect();
    let table;
    try {
      if (params?.length > 0) {
        const statement = await connection.prepare(query);
        table = await statement.query(...params);
      } else {
        table = await connection.query(query);
      }
    } finally {
      await connection.close();
    }
    return table;
  }

  async queryRow(query, params) {
    const result = await this.queryStream(query, params);
    const reader = result.readRows();
    try {
      const {done, value} = await reader.next();
      return done || !value.length ? null : value[0];
    } finally {
      await reader.return();
    }
  }

  async sql(strings, ...args) {
    return await this.query(strings.join("?"), args);
  }

  queryTag(strings, ...params) {
    return [strings.join("?"), params];
  }

  escape(name) {
    return `"${name}"`;
  }

  async describeTables() {
    return Array.from(await this.query("SHOW TABLES"), ({name}) => ({name}));
  }

  async describeColumns({table} = {}) {
    return Array.from(
      await this.query(`DESCRIBE ${this.escape(table)}`),
      ({column_name, column_type, null: nullable}) => ({
        name: column_name,
        type: getDuckDBType(column_type),
        nullable: nullable !== "NO",
        databaseType: column_type
      })
    );
  }

  static async of(sources = {}, config = {}) {
    const db = await createDuckDB();
    if (config.query?.castTimestampToDate === undefined) {
      config = {...config, query: {...config.query, castTimestampToDate: true}};
    }
    if (config.query?.castBigIntToDouble === undefined) {
      config = {...config, query: {...config.query, castBigIntToDouble: true}};
    }
    await db.open(config);
    await registerExtensions(db, config.extensions);
    await Promise.all(Object.entries(sources).map(([name, source]) => insertSource(db, name, source)));
    return new DuckDBClient(db);
  }

  static sql() {
    return this.of.apply(this, arguments).then((db) => db.sql.bind(db));
  }
}

Object.defineProperty(DuckDBClient.prototype, "dialect", {value: "duckdb"});

async function registerExtensions(db, extensions) {
  const {mainModule} = await bundle;
  const platform = Object.keys(bundles).find((platform) => mainModule === bundles[platform].mainModule);
  const con = await db.connect();
  try {
    await Promise.all(
      Object.entries(DUCKDB_MANIFEST.extensions).map(([name, {load, [platform]: ref}]) =>
        con
          .query(`INSTALL "${name}" FROM '${import.meta.resolve(ref)}'`)
          .then(() => (extensions === undefined ? load : extensions.includes(name)) && con.query(`LOAD "${name}"`))
      )
    );
  } finally {
    await con.close();
  }
}

async function insertSource(database, name, source) {
  source = await source;
  if (isFileAttachment(source)) return insertFile(database, name, source);
  if (isArrowTable(source)) return insertArrowTable(database, name, source);
  if (Array.isArray(source)) return insertArray(database, name, source);
  if (isArqueroTable(source)) return insertArqueroTable(database, name, source);
  if (typeof source === "string") return insertUrl(database, name, source);
  if (source && typeof source === "object") {
    if ("data" in source) {
      // data + options
      const {data, ...options} = source;
      if (isArrowTable(data)) return insertArrowTable(database, name, data, options);
      return insertArray(database, name, data, options);
    }
    if ("file" in source) {
      // file + options
      const {file, ...options} = source;
      return insertFile(database, name, file, options);
    }
  }
  throw new Error(`invalid source: ${source}`);
}

async function insertUrl(database, name, url) {
  const connection = await database.connect();
  try {
    await connection.query(`CREATE VIEW '${name}' AS FROM '${url}'`);
  } finally {
    await connection.close();
  }
}

async function insertFile(database, name, file, options) {
  const url = await file.url();
  if (url.startsWith("blob:")) {
    const buffer = await file.arrayBuffer();
    await database.registerFileBuffer(file.name, new Uint8Array(buffer));
  } else {
    await database.registerFileURL(file.name, new URL(url, location).href, 4); // duckdb.DuckDBDataProtocol.HTTP
  }
  const connection = await database.connect();
  try {
    switch (file.mimeType) {
      case "text/csv":
      case "text/tab-separated-values": {
        return await connection
          .insertCSVFromPath(file.name, {
            name,
            schema: "main",
            ...options
          })
          .catch(async (error) => {
            // If initial attempt to insert CSV resulted in a conversion
            // error, try again, this time treating all columns as strings.
            if (error.toString().includes("Could not convert")) {
              return await insertUntypedCSV(connection, file, name);
            }
            throw error;
          });
      }
      case "application/json":
        return await connection.insertJSONFromPath(file.name, {
          name,
          schema: "main",
          ...options
        });
      default:
        if (/\.arrow$/i.test(file.name)) {
          const buffer = new Uint8Array(await file.arrayBuffer());
          return await connection.insertArrowFromIPCStream(buffer, {
            name,
            schema: "main",
            ...options
          });
        }
        if (/\.parquet$/i.test(file.name)) {
          const table = file.size < 50e6 ? "TABLE" : "VIEW"; // for small files, materialize the table
          return await connection.query(`CREATE ${table} '${name}' AS SELECT * FROM parquet_scan('${file.name}')`);
        }
        if (/\.(db|ddb|duckdb)$/i.test(file.name)) {
          return await connection.query(`ATTACH '${file.name}' AS ${name} (READ_ONLY)`);
        }
        throw new Error(`unknown file type: ${file.mimeType}`);
    }
  } finally {
    await connection.close();
  }
}

async function insertUntypedCSV(connection, file, name) {
  const statement = await connection.prepare(
    `CREATE TABLE '${name}' AS SELECT * FROM read_csv_auto(?, ALL_VARCHAR=TRUE)`
  );
  return await statement.send(file.name);
}

async function insertArrowTable(database, name, table, options) {
  const connection = await database.connect();
  try {
    await connection.insertArrowTable(table, {
      name,
      schema: "main",
      ...options
    });
  } finally {
    await connection.close();
  }
}

async function insertArqueroTable(database, name, source) {
  // TODO When we have stdlib versioning and can upgrade Arquero to version 5,
  // we can then call source.toArrow() directly, with insertArrowTable()
  const arrow = await import("npm:apache-arrow");
  const table = arrow.tableFromIPC(source.toArrowBuffer());
  return await insertArrowTable(database, name, table);
}

async function insertArray(database, name, array, options) {
  const arrow = await import("npm:apache-arrow");
  const table = arrow.tableFromJSON(array);
  return await insertArrowTable(database, name, table, options);
}

async function createDuckDB() {
  const {mainWorker, mainModule} = await bundle;
  const worker = await duckdb.createWorker(mainWorker);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(mainModule);
  return db;
}

// https://duckdb.org/docs/sql/data_types/overview
function getDuckDBType(type) {
  switch (type) {
    case "BIGINT":
    case "HUGEINT":
    case "UBIGINT":
      return "bigint";
    case "DOUBLE":
    case "REAL":
    case "FLOAT":
      return "number";
    case "INTEGER":
    case "SMALLINT":
    case "TINYINT":
    case "USMALLINT":
    case "UINTEGER":
    case "UTINYINT":
      return "integer";
    case "BOOLEAN":
      return "boolean";
    case "DATE":
    case "TIMESTAMP":
    case "TIMESTAMP WITH TIME ZONE":
      return "date";
    case "VARCHAR":
    case "UUID":
      return "string";
    // case "BLOB":
    // case "INTERVAL":
    // case "TIME":
    default:
      if (/^DECIMAL\(/.test(type)) return "integer";
      return "other";
  }
}

// Returns true if the given value is an Observable FileAttachment.
function isFileAttachment(value) {
  return (
    value &&
    typeof value.name === "string" &&
    typeof value.url === "function" &&
    typeof value.arrayBuffer === "function"
  );
}

// Arquero tables have a `toArrowBuffer` function
function isArqueroTable(value) {
  return value && typeof value.toArrowBuffer === "function";
}

// Returns true if the value is an Apache Arrow table. This uses a “duck” test
// (instead of strict instanceof) because we want it to work with a range of
// Apache Arrow versions at least 7.0.0 or above.
// https://arrow.apache.org/docs/7.0/js/classes/Arrow_dom.Table.html
function isArrowTable(value) {
  return (
    value &&
    typeof value.getChild === "function" &&
    typeof value.toArray === "function" &&
    value.schema &&
    Array.isArray(value.schema.fields)
  );
}
