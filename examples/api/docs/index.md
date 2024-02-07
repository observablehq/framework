---
toc: false
theme: dashboard
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
const total = d3.sum(heatmaps.getChild("duration_count"))
const color = Plot.scale({
  color: {
    domain: d3.groupSort(heatmaps.getChild("duration_route"), (V) => -V.length, (d) => d).filter((d) => d) // prettier-ignore
  }
});

const routesByCount = summary.filter(d => d.type === 'count');
const routesByDuration = summary.filter(d => d.type === 'duration');
const routesByBytes = summary.filter(d => d.type === 'bytes');
```

# API logs

This dashboard provides an overview of API requests to observablehq.com. These charts visualize  a sample of API requests (${d3.format('.2s')(total)} to be exact) over a seven day period. For an in-depth walkthrough of the views in this dashboard, take a look at the [API report](/report).

<div class="grid grid-cols-1" style="grid-auto-rows: 611px;">
  <div class="card">${resize((width) => ApiHeatmap(heatmaps, {color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route'}))}</div>
  <div class="card">${resize((width) => ApiHeatmap(heatmaps, {color, width, title: "Response size heatmap", label: "Bytes", y1: 400, y2: 160_000, yMetric: 'bytes_count', fillMetric: 'bytes_route'}))}</div>
</div>

<div class="card grid grid-cols-1" style="grid-auto-rows: 461px;">
  ${resize((width) => ApiHistogram(heatmaps, {color, width, title: "Response latency histogram", label: "duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route', routeFilter: 'user'}))}
</div>

<div class="grid grid-cols-3" style="grid-auto-rows: 532px;">
  <div class="card">${resize((width) => ApiBars(routesByCount, {color, width, transform: (d) => d / 1000, label: "Total requests (thousands)", title: "Top API routes by count", x: "count", y: "route"}))}</div>
  <div class="card">${resize((width) => ApiBars(routesByDuration, {color, width, transform: (d) => d / (1000 * 60), label: "Total time (minutes)", title: "Top API routes by duration", x: "count", y: "route"}))}</div>
  <div class="card">${resize((width) => ApiBars(routesByBytes, {color, width, transform: (d) => d / (1000 * 1000), label: "Total size (MB)", title: "Top API routes by volume", x: "count", y: "route"}))}</div>
</div>
