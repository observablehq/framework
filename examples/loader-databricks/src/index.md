# Databricks data loader

Here’s a TypeScript data loader that queries Databricks. It runs a simple query that returns 100 rows from the `nyctaxi` sample dataset.

```js run=false
import {csvFormat} from "d3-dsv";
import {executeStatement} from "./databricks.js";

process.stdout.write(csvFormat(await executeStatement("SELECT * FROM samples.nyctaxi.trips LIMIT 100")));
```

The data loader uses a helper file, `databricks.js`, which is a thin wrapper on the `@databricks/sql` package. This reduces the amount of boilerplate you need to write to issue a query.

```js run=false
import "dotenv/config";
import {DBSQLClient, DBSQLLogger, LogLevel} from "@databricks/sql";

const token = process.env.DATABRICKS_TOKEN;
const host = process.env.DATABRICKS_SERVER_HOSTNAME;
const path = process.env.DATABRICKS_HTTP_PATH;

if (!token) throw new Error("missing DATABRICKS_TOKEN");
if (!host) throw new Error("missing DATABRICKS_SERVER_HOSTNAME");
if (!path) throw new Error("missing DATABRICKS_HTTP_PATH");

export async function openSession(f) {
  const logger = new DBSQLLogger({level: LogLevel.error}); // don’t pollute stdout
  const client = new DBSQLClient({logger});
  await client.connect({host, path, token});
  const session = await client.openSession();
  try {
    return await f(session, client);
  } finally {
    await session.close();
    await client.close();
  }
}

export async function executeStatement(statement, options) {
  return await openSession(async (session) => {
    const queryOperation = await session.executeStatement(statement, options);
    try {
      return await queryOperation.fetchAll();
    } finally {
      await queryOperation.close();
    }
  });
}
```

<div class="note">

To run this data loader, you’ll need to install `@databricks/sql`, `d3-dsv`, and `dotenv` using your preferred package manager such as npm or Yarn.

</div>

For the data loader to authenticate with Databricks, you will need to set several secret environment variable, each with the `DATABRICKS_` prefix. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks something like this:

```
DATABRICKS_SERVER_HOSTNAME="XXX.cloud.databricks.com"
DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/XXX"
DATABRICKS_TOKEN="XXX"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

This example uses a [personal access token](https://docs.databricks.com/en/dev-tools/nodejs-sql-driver.html#databricks-personal-access-token-authentication) to authenticate with Databricks; please follow the linked instructions to create your own token. Replace each `XXX` above with your credentials as appropriate. Alternatively, read Databricks’s [Authentication guide](https://docs.databricks.com/en/dev-tools/nodejs-sql-driver.html#authentication) to use a different authentication method.

The above data loader lives in `data/trips.csv.js`, so we can load the data as `data/trips.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects.

```js echo
const trips = FileAttachment("./data/trips.csv").csv({typed: true});
```

The `trips` table has several columns: `tpep_pickup_datetime`, `tpep_dropoff_datetime`, `trip_distance`, `fare_amount`, `pickup_zip`, and `dropoff_zip`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(trips)
```
