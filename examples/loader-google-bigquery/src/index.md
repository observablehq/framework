# Google BigQuery data loader

Here’s a JavaScript data loader that fetches the `confirmed_cases` metric from the publicly available BigQuery Covid19 dataset through the Google BigQuery API by using the [Google BigQuery Data Node.js Client](https://cloud.google.com/nodejs/docs/reference/bigquery-connection/latest).

```js run=false
import {csvFormat} from "d3-dsv";
import {runQuery} from "./google-bigquery.js";

const query = `
  SELECT
    FORMAT_TIMESTAMP('%Y-%m-%d', date) as date,
    confirmed_cases
  FROM
    \`bigquery-public-data.covid19_italy.data_by_province\`
  WHERE
    name = "Lombardia"
    AND province_name = "Lecco"
    AND date BETWEEN '2020-05-01 00:00:00 UTC' AND '2020-05-15 00:00:00 UTC'
  GROUP BY 1,2
  ORDER BY 1 ASC;
`;

(async () => {
  const rows = await runQuery(query);
  if (rows.length === 0) throw new Error("No data returned from the query.");
  process.stdout.write(csvFormat(rows));
})();

```

<div class="note">

This data loader depends on `@google-cloud/bigquery`, `d3-dsv`, and `dotenv`, which we reference in `package.json`.

</div>

The data loader uses a helper file, `google-bigquery.js`, which is a thin wrapper on the `@google-cloud/bigquery` package. This reduces the amount of boilerplate you need to run a report.

```js run=false
import "dotenv/config";
import {BigQuery} from "@google-cloud/bigquery";

const {BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY} = process.env;

if (!BQ_PROJECT_ID) throw new Error(".env missing BQ_PROJECT_ID");
if (!BQ_CLIENT_EMAIL) throw new Error(".env missing BQ_CLIENT_EMAIL");
if (!BQ_PRIVATE_KEY) throw new Error(".env missing BQ_PRIVATE_KEY");

const bigQueryClient = new BigQuery({
  projectId: BQ_PROJECT_ID,
  credentials: {
    client_email: BQ_CLIENT_EMAIL,
    private_key: BQ_PRIVATE_KEY.replace(/\\n/g, "\n")
  }
});

export async function runQuery(query) {
  return (await bigQueryClient.query({query})).rows;
}
```

For the data loader to authenticate with the Google Bigquery API, you will need to set several environment variables containing secret credentials. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
BQ_PROJECT_ID="123456789-abc"
BQ_CLIENT_EMAIL="xxx@yyy.iam.gserviceaccount.com"
BQ_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxxxxxxx-----END PRIVATE KEY-----\n"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

<div class="note">

See the [Google Bigquery API Quickstart](https://cloud.google.com/bigquery/docs/authentication) for how to create the service account needed to access the Google BigQuery API after it has been enable in the GCP console. The following [Google codelab](https://codelabs.developers.google.com/codelabs/cloud-bigquery-nodejs#0) might be helpful walk-through before getting started. Although the data in this example lives in the public database `bigquery-public-data.covid19_italy`, you still need to set up a service account and authenticate into one of your projects to access it.

</div>

The above data loader lives in `data/covidstats_it.csv.js`, so we can load the data as `data/covidstats_it.csv`.

```js echo
const covidStats = FileAttachment("data/covidstats_it.csv").csv({typed: true});
```

The `covidStats` table has two columns: `date` and `confirmed_cases`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(covidStats)
```

Lastly, we can pass the table to `Plot.plot`.

```js echo
Plot.plot({
  y: {
    nice: 2,
    grid: true,
    label: "Confirmed cases"
  },
  marks: [
    Plot.lineY(covidStats, {
      x: "date",
      y: "confirmed_cases",
      stroke: "steelblue",
      marker: true,
      tip: true
    })
  ]
})
```
