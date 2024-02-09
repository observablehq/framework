# API logs

This is an example Observable Framework project. It uses API logs data collected from [observablehq.com](observablehq.com), and visualizes them as heatmaps, histograms and bar charts.

## Data loaders

The datasets used are static snapshots. We use an [Apache Arrow](https://arrow.apache.org/) file to handle the large number of API logs.

## Charts

This example has two reusable components for building the visualizations: `apiHeatmap.js` and `apiBars.js`. Both use a combination of [Observable Plot](https://observablehq.com/plot/) and [D3](https://d3js.org/) to create highly detailed and interactive charts.

