[Framework examples →](../)

# Google BigQuery data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-google-bigquery/>

This Observable Framework example demonstrates how to write a JavaScript data loader that fetches metrics from the Google Bigquery API using the [Google BigQuery Data Node.js Client](https://cloud.google.com/nodejs/docs/reference/bigquery-connection/latest).

The data loader authenticates into BigQuery using a service account, then fetches a selection of the `confirmed_cases` metric from a publicly available Covid-19 BigQuery dataset and then displays the data in a line chart. The data loader lives in [`src/data/covidstats_it.csv.js`](./src/data/covidstats_it.csv.js) and uses the helper [`src/data/google-bigquery.js`](./src/data/google-bigquery.js).
