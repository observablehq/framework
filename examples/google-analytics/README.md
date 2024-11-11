[Framework examples →](../)

# Google Analytics

View live: <https://observablehq.observablehq.cloud/framework-example-google-analytics/>

This Observable Framework example tracks data from Google Analytics using the [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries). It contains a single page in `src/index.md`.

## Data loaders

To connect the data loaders to the Analytics API, you will need to set up a `.env` file at the root of this directory with three variables:

```
GA_PROPERTY_ID=111111111
GA_CLIENT_EMAIL=xxxx@yyy.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxxxxxxx-----END PRIVATE KEY-----\n"
```

> [!TIP]
> It is good practice to add `.env` to your `.gitignore` file to avoid
> leaking these secret variables.

There is also a hard-coded path in the data loaders (in this case, to define a `stringFilter` that restricts the loader to views on the Observable Plot documentation); you can modify it with a different path or remove it entirely.

The Google Analytics [API Quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries) guide will walk you through how to set this up for your own instance of Google Analytics.

## Charts

The dashboard displays a variety of charts, made with [Observable Plot](https://observablehq.com/plot/). With the key numbers at the top, a line chart or an area chart. Active users are displayed with a horizon chart faceted by channel. The “new vs. returning” chart is a Marimekko. Finally, the activity by day and hour is a punchcard chart. The code for each of these charts is available in [`src/index.md`](./src/index.md?plain=1).
