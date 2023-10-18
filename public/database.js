export default function DatabaseClient(name) {
  if (new.target === undefined) {
    return requestToken((name += "")).then(({type}) => {
      return new DatabaseClientImpl(name, type);
    });
  }
  if (new.target === DatabaseClient) {
    throw new TypeError("DatabaseClient is not a constructor");
  }
  Object.defineProperties(this, {
    name: {value: name, enumerable: true}
  });
}

const tokenRequests = new Map();

async function requestToken(name) {
  if (!name) throw new Error("Database name is not defined");
  if (tokenRequests.has(name)) {
    return await tokenRequests.get(name);
  }
  const response = await fetch(`/_database/${name}/token`).then((response) => {
    if (response.ok) {
      return response.json().then((json) => json);
    }
    invalidateToken(name);
    throw new Error(`Error ${response.statusText || response.status} creating database client '${name}':`);
  });
  tokenRequests.set(name, response);
  return response;
}

function invalidateToken(name) {
  tokenRequests.delete(name);
}

class DatabaseClientImpl extends DatabaseClient {
  async query(sql, params, {signal} = {}) {
    const token = await requestToken(this.name);
    const response = await fetch(`${token.origin}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({sql, params}),
      signal
    });
    if (!response.ok) {
      if (response.status === 401) {
        invalidateToken(this.name, token); // Force refresh on next query.
        throw new Error("Unauthorized: invalid or expired token. Try again?");
      }
      const contentType = response.headers.get("content-type");
      throw new Error(
        contentType && contentType.startsWith("application/json")
          ? (await response.json()).message
          : await response.text()
      );
    }
    const {data, schema: jsonSchema} = await response.json();

    const schema = parseJsonSchema(jsonSchema);
    if (schema) {
      coerce(schema, data);
      Object.defineProperty(data, "schema", {
        value: schema,
        writable: true
      });
    }

    return data;
  }

  // TODO: Does this serve any purpose?
  async queryRow(...params) {
    return (await this.query(...params))[0] || null;
  }

  queryTag(strings, ...args) {
    // TODO: This is Database-dialect specific
    return [strings.join("?"), args];
  }

  async sql() {
    return this.query(...this.queryTag.apply(this, arguments));
  }
}

function coerceBuffer(d) {
  return Uint8Array.from(d.data).buffer;
}

function coerceDate(d) {
  return new Date(d);
}

function coerceBigInt(d) {
  return BigInt(d);
}

function coercer(schema) {
  const mappings = schema
    .map(({name, type}) => {
      switch (type) {
        case "buffer":
          return [name, coerceBuffer];
        case "date":
          return [name, coerceDate];
        case "bigint":
          return [name, coerceBigInt];
      }
    })
    .filter((d) => d);
  return (data) => {
    for (const [column, coerce] of mappings) {
      for (const row of data) {
        if (row[column] != null) {
          row[column] = coerce(row[column]);
        }
      }
    }
    return data;
  };
}

function coerce(schema, data) {
  return coercer(schema)(data);
}

// The data connector returns certain types as "database types" that we want to
// treat as (JavaScript) types.
function jsType(type, typeFlag) {
  if (
    (type === "string" && typeFlag === "date") ||
    (type === "object" && typeFlag === "buffer")
    // (type === "string" && typeFlag === "bigint") // TODO coerce bigints
  ) {
    return typeFlag;
  }
  return type;
}

function parseType(typeOptions) {
  let type;
  let nullable;
  if (Array.isArray(typeOptions)) {
    // type: ["string"] (not nullable)
    // type: ["null", "string"] (nullable)
    type = typeOptions.find((t) => t !== "null") ?? "other";
    nullable = typeOptions.some((t) => t === "null");
  } else {
    // type: "string" (not nullable)
    type = typeOptions;
    nullable = false;
  }
  return {type, nullable};
}

/**
 * This function parses a JSON schema object into an array of objects, matching
 * the "column set schema" structure defined in the DatabaseClient
 * specification. It does not support nested types (e.g. array element types,
 * object property types), but may do so in the future.
 * https://observablehq.com/@observablehq/database-client-specification
 *
 * For example, this JSON schema object:
 * {
 *   type: "array",
 *   items: {
 *     type: "object",
 *     properties: {
 *       TrackId: { type: "integer" },
 *       Name: { type: "string", varchar: true },
 *       AlbumId: { type: "number", long: true },
 *       GenreId: { type: "array" },
 *     }
 *   }
 * }
 *
 * will be parsed into this column set schema:
 *
 * [
 *   {name: "TrackId", type: "integer"},
 *   {name: "Name", type: "string", databaseType: "varchar"},
 *   {name: "AlbumId", type: "number", databaseType: "long"},
 *   {name: "GenreId", type: "array"}
 * ]
 */
function parseJsonSchema(schema) {
  if (schema?.type !== "array" || schema.items?.type !== "object" || schema.items.properties === undefined) {
    return [];
  }
  return Object.entries(schema.items.properties).map(([name, {type: typeOptions, ...rest}]) => {
    const {type, nullable} = parseType(typeOptions);
    let typeFlag;

    // The JSON Schema representation used by the data connector includes some
    // arbitrary additional boolean properties to indicate the database type,
    // such as {type: ["null", "string"], date: true}. This code is a little
    // bit dangerous because the first of ANY exactly true property will be
    // considered the database type; for example, we must be careful to ignore
    // {type: "object", properties: {…}} and {type: "array", items: {…}}.
    for (const key in rest) {
      if (rest[key] === true) {
        typeFlag = key;
        break;
      }
    }

    return {
      name,
      type: jsType(type, typeFlag),
      nullable,
      ...(typeFlag && {databaseType: typeFlag})
    };
  });
}
