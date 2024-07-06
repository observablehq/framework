[Framework examples →](../)

# Analyzing web logs

View live: <https://observablehq.observablehq.cloud/framework-example-api/>

This report visualizes millions of requests to Observable’s API servers over a 7-day period in January 2024, revealing both traffic patterns and performance characteristics of Observable’s web service.

This example showcases the flexibility of Observable Plot for creating custom, performant visualizations, and hints at the potential of Framework’s data loaders for working with large datasets. This example also demonstrates reading [Apache Parquet files](https://observablehq.com/framework/lib/arrow). (While this public example uses static data, at Observable we use [Snowflake data loaders](https://observablehq.observablehq.cloud/framework-example-loader-snowflake/) internally to create a similar live dashboard.)

> [!TIP]
> Watch [our “last mile” webinar](https://www.youtube.com/watch?v=n5gFBQTClxc&t=696s) where we describe how we used this chart to optimize Observable’s API traffic.

## Implementation

```
.
├── README.md
├── observablehq.config.js
├── package.json
└── src
    ├── components
    │   ├── apiHeatmap.js
    │   └── apiHistogram.js
    ├── data
    │   ├── latency-heatmap-avatar.parquet
    │   ├── latency-heatmap-documents-at.parquet
    │   ├── latency-heatmap-documents-public.parquet
    │   ├── latency-heatmap.parquet
    │   ├── latency-histogram.parquet
    │   ├── size-heatmap.parquet
    │   ├── top-routes-count.parquet
    │   └── top-routes-duration.parquet
    └── index.md
```

No dependencies other than Framework. No required configuration (static data).

### Data

No data loaders; static data committed to git. The data is stored as Apache Parquet files. We use `FileAttachment.parquet` to read the files in the client. The files were generated using Snowflake data loaders, but we aren’t sharing the source code for the data loaders at this time. You can see the other Snowflake data loader example.

The data is represented as TKTKTK.

### Components

Two custom components.

This example has two reusable components for building the visualizations: `apiHeatmap.js` and `apiBars.js`. Both use a combination of [Observable Plot](https://observablehq.com/plot/) and [D3](https://d3js.org/) to create highly detailed and interactive charts.

Needs more explanation of how these work.
