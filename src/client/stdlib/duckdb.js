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

const bundle = await duckdb.selectBundle({
  mvp: {
    mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm"),
    mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js")
  },
  eh: {
    mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-eh.wasm"),
    mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js")
  }
});

const logger = new duckdb.ConsoleLogger();

export async function sql(strings, ...args) {
  const db = await DuckDBClient.of();
  return await db.query(strings.join("?"), args);
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
      schema: getArrowTableSchema(batch.value),
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
    const result = await this.queryStream(query, params);
    const results = [];
    for await (const rows of result.readRows()) {
      for (const row of rows) {
        results.push(row);
      }
    }
    results.schema = result.schema;
    return results;
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
    const tables = await this.query("SHOW TABLES");
    return tables.map(({name}) => ({name}));
  }

  async describeColumns({table} = {}) {
    const columns = await this.query(`DESCRIBE ${this.escape(table)}`);
    return columns.map(({column_name, column_type, null: nullable}) => ({
      name: column_name,
      type: getDuckDBType(column_type),
      nullable: nullable !== "NO",
      databaseType: column_type
    }));
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
    await Promise.all(
      Object.entries(sources).map(async ([name, source]) => {
        source = await source;
        if (isFileAttachment(source)) {
          // bare file
          await insertFile(db, name, source);
        } else if (isArrowTable(source)) {
          // bare arrow table
          await insertArrowTable(db, name, source);
        } else if (Array.isArray(source)) {
          // bare array of objects
          await insertArray(db, name, source);
        } else if (isArqueroTable(source)) {
          await insertArqueroTable(db, name, source);
        } else if ("data" in source) {
          // data + options
          const {data, ...options} = source;
          if (isArrowTable(data)) {
            await insertArrowTable(db, name, data, options);
          } else {
            await insertArray(db, name, data, options);
          }
        } else if ("file" in source) {
          // file + options
          const {file, ...options} = source;
          await insertFile(db, name, file, options);
        } else {
          throw new Error(`invalid source: ${source}`);
        }
      })
    );
    return new DuckDBClient(db);
  }
}

Object.defineProperty(DuckDBClient.prototype, "dialect", {
  value: "duckdb"
});

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
          return await connection.query(`CREATE VIEW '${name}' AS SELECT * FROM parquet_scan('${file.name}')`);
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
  const worker = await duckdb.createWorker(bundle.mainWorker);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule);
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

function getArrowTableSchema(table) {
  return table.schema.fields.map(getArrowFieldSchema);
}

function getArrowFieldSchema(field) {
  return {
    name: field.name,
    type: getArrowType(field.type),
    nullable: field.nullable,
    databaseType: `${field.type}`
  };
}

// https://github.com/apache/arrow/blob/89f9a0948961f6e94f1ef5e4f310b707d22a3c11/js/src/enum.ts#L140-L141
function getArrowType(type) {
  switch (type.typeId) {
    case 2: // Int
      return "integer";
    case 3: // Float
    case 7: // Decimal
      return "number";
    case 4: // Binary
    case 15: // FixedSizeBinary
      return "buffer";
    case 5: // Utf8
      return "string";
    case 6: // Bool
      return "boolean";
    case 8: // Date
    case 9: // Time
    case 10: // Timestamp
      return "date";
    case 12: // List
    case 16: // FixedSizeList
      return "array";
    case 13: // Struct
    case 14: // Union
      return "object";
    case 11: // Interval
    case 17: // Map
    default:
      return "other";
  }
}
