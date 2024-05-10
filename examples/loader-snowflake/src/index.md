# Snowflake data loader

Here’s a TypeScript data loader that queries Snowflake.

```ts run=false
import {csvFormat} from "d3-dsv";
import {run} from "./snowflake.js";

const start = new Date("2024-01-01");
const end = new Date("2024-01-08");

process.stdout.write(
  csvFormat(
    await run((query) =>
      query(
        `SELECT '/' || path AS "path", COUNT(*) AS "count"
FROM fct_api_logs
WHERE time between :1 and :2
AND STARTSWITH(path, 'document/@d3/')
GROUP BY 1
HAVING "count" >= 10
ORDER BY 2 DESC`,
        [start, end]
      )
    )
  )
);
```

The data loader uses a helper file, `snowflake.ts`, which is a thin wrapper on the `snowflake-sdk` package. This reduces the amount of boilerplate you need to write to issue a query.

```ts run=false
import "dotenv/config";
import type {Binds, Connection, ConnectionOptions} from "snowflake-sdk";
import snowflake from "snowflake-sdk";

const {
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_USERNAME,
  SNOWFLAKE_PASSWORD,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_SCHEMA,
  SNOWFLAKE_WAREHOUSE,
  SNOWFLAKE_ROLE
} = process.env;

if (!SNOWFLAKE_ACCOUNT) throw new Error("missing SNOWFLAKE_ACCOUNT");
if (!SNOWFLAKE_USERNAME) throw new Error("missing SNOWFLAKE_USERNAME");

const options: ConnectionOptions = {
  account: SNOWFLAKE_ACCOUNT,
  username: SNOWFLAKE_USERNAME,
  password: SNOWFLAKE_PASSWORD,
  database: SNOWFLAKE_DATABASE,
  schema: SNOWFLAKE_SCHEMA,
  warehouse: SNOWFLAKE_WAREHOUSE,
  role: SNOWFLAKE_ROLE
};

export async function run<T>(f: (query: (sql: string, params?: Binds) => Promise<any[]>) => Promise<T>): Promise<T> {
  const connection = await connect(options);
  try {
    return await f((sql, params) => execute(connection, sql, params));
  } finally {
    await destroy(connection);
  }
}

async function connect(options: ConnectionOptions): Promise<Connection> {
  const connection = (snowflake as any).createConnection(options);
  await new Promise<void>((resolve, reject) => {
    connection.connect((error) => {
      if (error) return reject(error);
      resolve();
    });
  });
  return connection;
}

async function destroy(connection: Connection): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    connection.destroy((error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

async function execute(connection: Connection, sql: string, params?: Binds): Promise<any[]> {
  return await new Promise<any[]>((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds: params,
      complete(error, statement, rows) {
        if (error) return reject(error);
        resolve(rows!);
      }
    });
  });
}
```

<div class="note">

To run this data loader, you’ll need to install `snowflake-sdk`, `d3-dsv`, and `dotenv` using your preferred package manager such as npm or Yarn.

</div>

For the data loader to authenticate with Snowflake, you will need to set several secret environment variable, each with the `SNOWFLAKE_` prefix. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
SNOWFLAKE_ACCOUNT="XXX"
SNOWFLAKE_DATABASE="XXX"
SNOWFLAKE_ROLE="XXX"
SNOWFLAKE_SCHEMA="XXX"
SNOWFLAKE_USERNAME="XXX"
SNOWFLAKE_WAREHOUSE="XXX"
SNOWFLAKE_PASSWORD="XXX"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

Replace each `XXX` above with your credentials. Alternatively, read Snowflake’s [Authenticating connections guide](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-authenticate) to use a different authentication method.

The above data loader lives in `data/api-requests.csv.js`, so we can load the data as `data/api-requests.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects.

```js echo
const requests = FileAttachment("./data/api-requests.csv").csv({typed: true});
```

The `requests` table has two columns: `path` and `count`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(requests)
```
