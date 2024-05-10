# PostgreSQL data loader

Here’s a TypeScript data loader that queries a PostgreSQL database.

```ts run=false
import {csvFormat} from "d3-dsv";
import {run} from "./postgres.js";

process.stdout.write(
  csvFormat(
    await run(
      (sql) =>
        sql`WITH counts AS (SELECT DATE_TRUNC('day', e.time) AS "date", COUNT(*) AS "count"
  FROM document_events e
  JOIN documents d ON d.id = e.id
  JOIN users u ON u.id = d.user_id
  WHERE u.login = 'd3'
  GROUP BY 1)
SELECT g.date, COALESCE(c.count, 0) AS count
FROM GENERATE_SERIES(DATE '2019-01-01', DATE '2019-12-31', INTERVAL '1 DAY') AS g(date)
LEFT JOIN counts c ON c.date = g.date
ORDER BY 1 DESC`
    )
  )
);
```

<div class="note">

To run this data loader, you’ll need to install `postgres`, `d3-dsv`, and
`dotenv` using your preferred package manager such as npm or Yarn. You’ll also need the provided `postgres.ts` helper file.

</div>

The query above uses `GENERATE_SERIES` to compute each day in 2019; this is used to populate zeroes for days with no events. Without this, rows would be missing for days with no events. (And unless you supply the **interval** mark option, Observable Plot won’t know the expected regularity of the data and hence will interpolate over missing data — which is probably misleading.)

For the data loader to authenticate with your PostgreSQL database, you will need to set the secret `POSTGRES_URL` environment variable. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
POSTGRES_URL="postgres://USERNAME:PASSWORD@HOST.example.com:5432/DATABASE"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

The above data loader lives in `data/edits.csv.js`, so we can load the data as `data/edits.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects.

```js echo
const edits = FileAttachment("./data/edits.csv").csv({typed: true});
```

The `edits` table has two columns: `date` and `count`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(edits)
```

Lastly, we can pass the table to `Plot.plot` to make a simple line chart.

```js echo
Plot.plot({
  marks: [
    Plot.areaY(edits, {x: "date", y: "count", curve: "step", tip: true}),
    Plot.ruleY([0])
  ]
})
```
