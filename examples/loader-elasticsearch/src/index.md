# Elasticsearch data loader

Here’s a TypeScript data loader that queries an Elasticsearch cluster.

```ts
import { csvFormat } from "d3-dsv";
import { esClient } from "./es_client.js";

interface AggsResponseFormat {
  logs_histogram: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
      response_code: {
        buckets: Array<{ key: string; doc_count: number }>;
      };
    }>;
  };
}

interface LoaderOutputFormat {
  date: string;
  count: number;
  response_code: string;
}

const resp = await esClient.search<unknown, AggsResponseFormat>({
  index: "kibana_sample_data_logs",
  size: 0,
  aggs: {
    logs_histogram: {
      date_histogram: {
        field: "@timestamp",
        calendar_interval: "1d",
      },
      aggs: {
        response_code: {
          terms: {
            field: "response.keyword",
          },
        },
      },
    },
  },
});

process.stdout.write(
  csvFormat(
    // This transforms the nested response from Elasticsearch into a flat array.
    resp.aggregations!.logs_histogram.buckets.reduce<Array<LoaderOutputFormat>>(
      (p, c) => {
        p.push(
          ...c.response_code.buckets.map((d) => ({
            // Just keep the date from the full ISO string.
            date: c.key_as_string.split("T")[0],
            count: d.doc_count,
            response_code: d.key,
          })),
        );

        return p;
      },
      [],
    ),
  ),
);
```

The data loader uses a helper file, `es_client.ts`, which provides a wrapper on the `@elastic/elasticsearch` package. This reduces the amount of boilerplate you need to write to issue a query.

```ts
import "dotenv/config";
import { Client } from "@elastic/elasticsearch";

// Have a look at the "Getting started" guide of the Elasticsearch node.js client
// to learn more about how to configure these environment variables:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html

const {
  // ES_NODE can include the username and password in the URL, e.g.:
  // ES_NODE=https://<USERNAME>:<PASSWORD>@<HOST>:9200
  ES_NODE,
  // As an alternative to ES_NODE when using Elastic Cloud, you can use ES_CLOUD_ID and
  // set it to the Cloud ID that you can find in the cloud console of the deployment (https://cloud.elastic.co/).
  ES_CLOUD_ID,
  // ES_API_KEY can be used instead of username and password.
  // The API key will take precedence if both are set.
  ES_API_KEY,
  ES_USERNAME,
  ES_PASSWORD,
  // the fingerprint (SHA256) of the CA certificate that is used to sign
  // the certificate that the Elasticsearch node presents for TLS.
  ES_CA_FINGERPRINT,
  // Warning: This option should be considered an insecure workaround for local development only.
  // You may wish to specify a self-signed certificate rather than disabling certificate verification.
  // ES_UNSAFE_TLS_REJECT_UNAUTHORIZED can be set to FALSE to disable certificate verification.
  // See https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html#auth-tls for more.
  ES_UNSAFE_TLS_REJECT_UNAUTHORIZED,
} = process.env;

if ((!ES_NODE && !ES_CLOUD_ID) || (ES_NODE && ES_CLOUD_ID))
  throw new Error(
    "Either ES_NODE or ES_CLOUD_ID need to be defined, but not both.",
  );

const esUrl = ES_NODE ? new URL(ES_NODE) : undefined;
const isHTTPS = esUrl?.protocol === "https:";
const isLocalhost = esUrl?.hostname === "localhost";

export const esClient = new Client({
  ...(ES_NODE ? { node: ES_NODE } : {}),
  ...(ES_CLOUD_ID ? { cloud: { id: ES_CLOUD_ID } } : {}),
  ...(ES_CA_FINGERPRINT ? { caFingerprint: ES_CA_FINGERPRINT } : {}),
  ...(ES_API_KEY
    ? {
        auth: {
          apiKey: ES_API_KEY,
        },
      }
    : {}),
  ...(!ES_API_KEY && ES_USERNAME && ES_PASSWORD
    ? {
        auth: {
          username: ES_USERNAME,
          password: ES_PASSWORD,
        },
      }
    : {}),
  ...(isHTTPS &&
  isLocalhost &&
  ES_UNSAFE_TLS_REJECT_UNAUTHORIZED?.toLowerCase() === "false"
    ? {
        tls: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});
```

<div class="note">

To run this data loader, you’ll need to install `@elastic/elasticsearch`, `d3-dsv` and `dotenv` using your preferred package manager such as npm or Yarn.

</div>

For the data loader to authenticate with your Elasticsearch cluster, you need to set the environment variables defined in the helper. If you use GitHub, you can use [secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to set environment variables; other platforms provide similar functionality for continuous deployment. For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
ES_NODE="https://USERNAME:PASSWORD@HOST:9200"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

The above data loader lives in `data/kibana_sample_data_logs.csv.ts`, so we can load the data as `data/kibana_sample_data_logs.csv`. The `FileAttachment.csv` method parses the file and returns a promise to an array of objects.

```js echo
const logs = FileAttachment("./data/kibana_sample_data_logs.csv").csv({typed: true});
```

The `logs` table has three columns: `date`, `count` and `response_code`. We can display the table using `Inputs.table`.

```js echo
Inputs.table(logs)
```

Lastly, we can pass the table to Observable Plot to make a line chart.

```js echo
Plot.plot({
  style: "overflow: visible;",
  y: { grid: true },
  marks: [
    Plot.ruleY([0]),
    Plot.line(logs, {x: "date", y: "count", stroke: "response_code", tip: true}),
    Plot.text(logs, Plot.selectLast({x: "date", y: "count", z: "response_code", text: "response_code", textAnchor: "start", dx: 3}))
  ]
})
```
