# Google BigQuery data loader

Here’s a JavaScript data loader that fetches the `confirmed_cases` metric from the publicly available BigQuery Covid19 dataset through the Google BigQuery API by using the [Google BigQuery Data Node.js Client](https://cloud.google.com/nodejs/docs/reference/bigquery-connection/latest).

```js run=false
import { csvFormat, csvParse } from "d3-dsv";
import { runQuery } from "./google-bigquery.js";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const query = `
  SELECT 
    FORMAT_TIMESTAMP('%Y-%m-%d', date) as formatted_date, 
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
  try {
    const rows = await runQuery(query);

    console.log("Query Results:", rows);

    if (rows.length === 0) {
      console.log("No data returned from the query.");
      return;
    }

    const csvData = csvFormat(
      rows.map(d => ({
        formatted_date: d.formatted_date,
        confirmed_cases: d.confirmed_cases
      }))
    );

    const filePath = join(__dirname, "../covidstats_it.csv");
    await fs.writeFile(filePath, csvData);
    console.log(`CSV file written successfully to ${filePath}`);

    const fileContent = await fs.readFile(filePath, "utf8");
    const parsedData = csvParse(fileContent, { typed: true });

    console.log("Parsed Data:", parsedData);

  } catch (error) {
    console.error('Error running query or processing file:', error);
  }
})();
```

<div class="tip">

The Google BigQuery API returns dates in ISO 8601 `YYYY-MM-DD` format, which ensures a standard representation that will be correctly parsed by `FileAttachment.csv`.

</div>

The data loader uses a helper file, `google-bigquery.js`, which is a thin wrapper on the `@google-cloud/bigquery` package. This reduces the amount of boilerplate you need to run a report.

```js run=false
import "dotenv/config";
import {BigQuery} from "@google-cloud/bigquery";

const {BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY} = process.env;

if (!BQ_PROJECT_ID) throw new Error("missing BQ_PROJECT_ID");
if (!BQ_CLIENT_EMAIL) throw new Error("missing BQ_CLIENT_EMAIL");
if (!BQ_PRIVATE_KEY) throw new Error("missing BQ_PRIVATE_KEY");

const bigQueryClient = new BigQuery({
  projectId: BQ_PROJECT_ID,
  credentials: {
    client_email: BQ_CLIENT_EMAIL,
    private_key: BQ_PRIVATE_KEY.replace(/\\n/g, '\n')
  }
});

export async function runQuery(query) {
  const [rows] = await bigQueryClient.query({ query });
  return rows;
}
```

<div class="note">

To run this data loader, you’ll need to install `@google-cloud/bigquery`, `d3-dsv`, `d3-time-format`, and `dotenv` using your preferred package manager such as npm or Yarn.

</div>

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

See the [Google Bigquery API Quickstart](https://cloud.google.com/bigquery/docs/authentication) for how to create the service account needed to access the Google BigQuery API after it has been enable in the GCP console. The following Google codelab might be helpful walk-through before getting started: https://codelabs.developers.google.com/codelabs/cloud-bigquery-nodejs#0

</div>

The above data loader lives in `data/covidstats_it.csv.js`, so we can load the data as `data/covidstats_it.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects, which gets rendered through/into `covid_2020.md`. To create the csv file, please run `node src/data/covidstats_it.csv.js` from the right directory.

```js echo
const covidStats = FileAttachment("covidstats_it.csv").csv({typed: true});
```

The `covidStats` table has two columns: `formatted_date` and `confirmed_cases`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(covidStats)
```

Lastly, we can pass the table to `Plot.plot` to make a simple line chart.

```js echo
display(
  Plot.plot({
    width: 800,
    height: 400,
    marginTop: 30,
    marginBottom: 90,  
    x: {
      type: "utc",
      label: "Date",
      labelAnchor: "right", 
      tickFormat: d3.utcFormat("%Y-%m-%d"),
      tickRotate: -90 
    },
    y: {
      grid: true,
      label: "Confirmed Cases",
      domain: [2000, 3000], 
      tickFormat: d => d
    },
    marks: [
      Plot.lineY(covidStats, {
        x: d => new Date(d.formatted_date),
        y: "confirmed_cases",
        stroke: "steelblue",
        curve: "step"
      }),
      Plot.ruleY([0])
    ]
  })
);
```

### The output should look as follows:
![image info](covid_stats.png)