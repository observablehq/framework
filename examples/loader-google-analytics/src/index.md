# Google Analytics data loader

Here’s a JavaScript data loader that fetches the `activeUsers` metric from the Google Analytics API using the [Google Analytics Data Node.js Client](https://googleapis.dev/nodejs/analytics-data/latest/).

```js run=false
import {csvFormat} from "d3-dsv";
import {runReport} from "./google-analytics.js";

const {rows} = await runReport({
  dateRanges: [{startDate: "2023-06-01", endDate: "2023-09-01"}],
  dimensions: [{name: "date"}],
  metrics: [{name: "activeUsers"}],
  orderBys: [{dimension: {dimensionName: "date"}}]
});

process.stdout.write(
  csvFormat(
    rows.map((d) => ({
      date: parseDate(d.dimensionValues[0].value),
      value: d.metricValues[0].value
    }))
  )
);

function parseDate(date) {
  return new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`);
}
```

<div class="tip">

The Google Analytics API returns dates in the `YYYYMMDD` format, so we convert them to ISO 8601 `YYYY-MM-DD` format and then pass them to the `Date` constructor in the `parseDate` function. This ensures a standard representation that will be correctly parsed by `FileAttachment.csv`.

</div>

The data loader uses a helper file, `google-analytics.js`, which is a thin wrapper on the `@google-analytics/data` package. This reduces the amount of boilerplate you need to run a report.

```js run=false
import "dotenv/config";
import {BetaAnalyticsDataClient} from "@google-analytics/data";

const {GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY} = process.env;

if (!GA_CLIENT_EMAIL) throw new Error("missing GA_CLIENT_EMAIL");
if (!GA_PRIVATE_KEY) throw new Error("missing GA_PRIVATE_KEY");

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: GA_CLIENT_EMAIL,
    private_key: GA_PRIVATE_KEY
  }
});

const defaultProperty = GA_PROPERTY_ID && `properties/${GA_PROPERTY_ID}`;

export async function runReport({property = defaultProperty, ...options} = {}) {
  const [response] = await analyticsClient.runReport({property, ...options});
  return response;
}
```

<div class="note">

To run this data loader, you’ll need to install `@google-analytics/data`, `d3-dsv`, and
`dotenv` using your preferred package manager such as npm or Yarn.

</div>

For the data loader to authenticate with the Google Analytics API, you will need to set several environment variables containing secret credentials. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
GA_PROPERTY_ID="123456789"
GA_CLIENT_EMAIL="xxx@yyy.iam.gserviceaccount.com"
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxxxxxxx-----END PRIVATE KEY-----\n"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

<div class="note">

See the [Google Analytics API Quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries) for how to create the service account needed to access the Google Analytics API.

</div>

The above data loader lives in `data/active-users.csv.js`, so we can load the data as `data/active-users.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects.

```js echo
const activeUsers = FileAttachment("./data/active-users.csv").csv({typed: true});
```

The `activeUsers` table has two columns: `date` and `value`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(activeUsers)
```

Lastly, we can pass the table to `Plot.plot` to make a simple line chart.

```js echo
Plot.plot({
  marks: [
    Plot.axisY({tickFormat: (d) => d / 1000, label: "Daily active users (thousands)"}),
    Plot.ruleY([0]),
    Plot.lineY(activeUsers, {x: "date", y: "value", curve: "step", tip: true})
  ]
})
```
