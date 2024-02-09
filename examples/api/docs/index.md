---
toc: true
---

```js
import {ApiBars} from "./components/apiBars.js";
import {ApiHeatmap, ApiHistogram} from "./components/apiHeatmap.js";
```

```js
const heatmaps = FileAttachment("data/api-heatmaps.arrow").arrow();
const summary = FileAttachment("data/summary.csv").csv();
```

```js
const latencyByRouteCanvas = document.createElement("canvas");
const latencyCanvas = document.createElement("canvas");
const latencyFilterCanvas = document.createElement("canvas");
```

```js
const total = d3.sum(heatmaps.getChild("duration_count"))
const color = Plot.scale({
  color: {
    domain: d3.groupSort(heatmaps.getChild("duration_route"), (V) => -V.length, (d) => d).filter((d) => d) // prettier-ignore
  }
});

const routesByCount = summary.filter(d => d.type === 'count');
const routesByDuration = summary.filter(d => d.type === 'duration');
const routesByBytes = summary.filter(d => d.type === 'bytes');
const count = heatmaps.getChild('duration_count');
const distinctRoutes = Array.from(new Set(heatmaps.getChild('duration_route'))).filter(d => d).sort(d3.ascending);
const routeDropdown = Inputs.select(distinctRoutes, {label: 'Select a route', value: 'document/{id}@{version}'});
const routeFilter = view(routeDropdown);
const endpointLegend = (endpoint) => Plot.rect([endpoint], { x1: 0, y1: 0, x2: 10, y2: 10, fill: d => d }).plot({
  width: 10, height: 10, margin: 0, axis: null, color: color, x: { range: [0, 10] }, y: { range: [0, 10] }});
```

# Analyzing API logs

Analyzing API logs can be helpful for finding under-performing endpoints and web scrapers, but looking at this data in aggregate often hides interesting trends. This visualization shows a heatmap of ${d3.format('.2s')(total)} API requests for [observablehq.com](https://observablehq.com/) from a sampled 7-day period. Each cell is colored by the most common endpoint at the point in time and duration. Hover over a pixel to read the name of the endpoint.

<div class="grid grid-cols-1" style="grid-auto-rows: 611px;">
  <div class="card">${resize((width) => ApiHeatmap(heatmaps, {canvas: latencyByRouteCanvas, color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route'}))}</div>
</div>

What do we see? There are clear intervals of activity for certain endpoints, such as ${endpointLegend(`document/{id}@{version}`)} `document/{id}@{version}`, the endpoint used to request a specific verson of an Observable notebook, and ${endpointLegend(`documents/{at}`)} `documents/{at}`, which returns all the notebooks for a given user.

Here is the same data visualized as a bar chart counting the number of requests by each endpoint.

<div class="grid" style="grid-auto-rows: 532px;">
  <div class="card">${resize((width) => ApiBars(routesByCount, {color, width, transform: (d) => d / 1000, label: "Total requests (thousands)", title: "Top API routes by count", x: "count", y: "route"}))}</div>
</div>

With the bar chart, we lose a lot of the details available in the heatmap. The ${endpointLegend(`document/{id}@{version}`)} `document/{id}@{version}` endpoint is a less common in aggregate than ${endpointLegend(`d/{id}.js`)} `d/{id}.js`, but it likely one that we would want to investigate further.

If we want to identify general periodicity in our data, we can change our categorical color scale based on the endpoint name to a sequential scale encoding the frequency of requests at in a given point.

<div class="grid grid-cols-1" style="grid-auto-rows: 651px;">
  <div class="card">
    <div>${resize((width) => ApiHeatmap(heatmaps, {canvas: latencyCanvas, color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route', type: 'frequency'}))}</div>
    <div style="float: right">${Plot.legend({color: {domain: d3.extent(count, d => d / 2), nice: true }})}</div>
</div>

The sheer volume of requests that happened on midday January 27th becomes much more apparent with the new color encoding. From what we saw in the earlier heatmap, this trend is likely caused by the ${endpointLegend(`document/{id}@{version}`)} `document/{id}@{version}` endpoint. We can also filter our data in our heatmap to see if that theory is correct.

${routeDropdown}

<div class="grid grid-cols-1" style="grid-auto-rows: 651px;">
  <div class="card">
    <div>${resize((width) => ApiHeatmap(heatmaps, {canvas: latencyFilterCanvas, color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route', type: 'frequency', routeFilter}))}</div>
    <div style="float: right">${Plot.legend({color: {domain: d3.extent(count, d => d / 2), nice: true }})}</div>
</div>

There are many ways we could optimize this endpoint, perhaps by blocking the specific IP addresses that are abusing our terms of service, but we were only able to see these trends by visualizing our data in this granular way.

Take a look at our [API logs dashboard](/dashboard) to see how the Observable team turns these datasets into actionable insights.
