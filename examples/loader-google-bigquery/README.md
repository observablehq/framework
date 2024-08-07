[Framework examples →](../)

# Google Analytics data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-google-analytics/>

This Observable Framework example demonstrates how to write a JavaScript data loader that fetches metrics from the Google Analytics API  using the [Google Analytics Data Node.js Client](https://googleapis.dev/nodejs/analytics-data/latest/). The data loader fetches the `activeUsers` metric for a specified date range and then displays the data in a line chart. The data loader lives in [`src/data/active-users.csv.js`](./src/data/active-users.csv.js) and uses the helper [`src/data/google-analytics.js`](./src/data/google-analytics.js).
