# Observable Framework examples

> [!NOTE]
> To get started with Framework, please read [_Getting started_](https://observablehq.com/framework/getting-started).

## About these examples

We offer two types of examples: **techniques** and **showcases**.

Technique examples address lower-level needs such as “how to load data from Google Analytics” or “how to make a bump chart”. They’re smaller, piecemeal examples for common development tasks. Technique examples are intended to teach you how to accomplish a specific task or to provide reusable code that can be copy-pasted into your Framework project.

Showcase examples, in contrast, address higher-level user needs such as “how to analyze website traffic” or “how to show the growth of an open-source project”. These larger, complete examples demonstrate how to create useful data apps. Showcase examples are intended primarily to inspire and show Framework’s potential. As applied examples, showcase examples also demonstrate multiple techniques working together; we encourage you to view source.

### How to use these examples

You can browse the source code for any of the examples by navigating to the respective folder on GitHub. You can then copy-paste the code into your own project or download individual files. All of the example code in this repository is covered by the same open-source [license](../LICENSE) as Framework itself.

If you’d like to run (and tinker with) these examples locally, you can [clone the repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) like so:

```sh
git clone git@github.com:observablehq/framework.git
```

Then `cd` into the desired example directory. From there you would typically run `npm install` or `yarn` to install dependencies. Please refer to each example’s `README.md` file for specific instructions; some examples may require additional configuration, such as setting environment variables to talk to external data sources.

**We welcome contributions!** If you have an example that you’d like to share with the community, please [open a pull request](https://docs.github.com/en/pull-requests). Or if there’s an example you’d like to see, please let us know by [filing an issue](https://github.com/observablehq/framework/issues). If you have questions, please [open a discussion](https://github.com/observablehq/framework/discussions).

## Showcase examples

### [`api`](./api) - Analyzing web logs

[View example](https://observablehq.com/framework/examples/api/) · [Source code](./api) · This report visualizes millions of requests to Observable’s API servers over a 7-day period in January 2024, revealing both traffic patterns and performance characteristics of Observable’s web service. This example showcases the flexibility of Observable Plot for creating custom, performant visualizations, and hints at the potential of Framework’s data loaders for working with large datasets. This example also demonstrates reading [Apache Arrow files](https://observablehq.com/framework/lib/arrow). (While this public example uses static data, at Observable we use Snowflake [data loaders](https://observablehq.com/framework/loaders) internally to create a similar live dashboard.)

### [`eia`](./eia) - U.S. electricity grid

[View example](https://observablehq.com/framework/examples/eia/) · [Source code](./eia) · This dashboard visualizes electricity generation and demand across the U.S. electricity grid. The included data loaders demonstrate how to retrieve live data from the U.S. Energy Information Administration (EIA) API, while the dashboard demonstrates how to produce interactive maps, bar charts, and time-series charts with Observable Plot. A range input allows the user to rewind time to any point in the previous 24 hours, and a table shows details.

### [`plot`](./plot) - Observable Plot downloads

[View example](https://observablehq.com/framework/examples/plot/) · [Source code](./plot) · This dashboard visualizes the popularity and development of [Observable Plot](https://github.com/observablehq/plot), our open-source visualization library. The included data loaders demonstrate how to retrieve data from GitHub and npm APIs, including star counts, releases, downloads, and open issues. A time-series chart shows daily npm downloads with 7- and 28-day moving averages, and a burndown chart shows the age of open issues over time.

### [`mortgage-rates`](./mortgage-rates) - Primary mortgage market survey

[View example](https://observablehq.com/framework/examples/mortgage-rates/) · [Source code](./mortgage-rates) · This dashboard visualizes Freddie Mac’s historical mortgage rates data. The included data loader demonstrates how to retrieve CSV data from Freddie Mac and visualize the result as a zoomable chart with Observable Plot.

## Technique examples

* [`chess`](./chess) - Loading Zip data from FIDE; creating a bump chart with Observable Plot
* [`google-analytics`](./google-analytics) - Loading data from Google Analytics
* [`hello-world`](./hello-world) - A minimal Framework project
* [`penguin-classification`](./penguin-classification) - Logistic regression in Python; validating models with Observable Plot

## TODO

* Big number with area chart
* Line chart with moving averages
* Punchcard chart
* Bump chart/rank chart
* JSZip data loader
* Google Analytics data loader
* GitHub data loader
* npm data loader
* Snowflake data loader
