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

# Analyzing API logs

Analyzing API logs can be helpful for finding under-performing endpoints and web scrapers, but looking at this data in aggregate often hides interesting stories. Here is a look at the top 20 endpoints for [observablehq.com](https://observablehq.com/) by the number of requests for from a sampled 7-day period.

<div class="grid" style="grid-auto-rows: 532px;">
  <div class="card">${resize((width) => ApiBars(routesByCount, {color, width, transform: (d) => d / 1000, label: "Total requests (thousands)", title: "Top API routes by count", x: "count", y: "route"}))}</div>
</div>

In aggregate, we see that d/{id}.js, which is a request for a private notebook, is the most requested endpoint, but is that consistent every day? Or do we see it shift over the 7-day timeframe? What about these other endpoints, do they have any irregular patterns? If we plot all of our datapoints, rather than aggregate them into a bar chart, we see a much more diverse picture.

Here is a heatmap view of the same dataset, now showing not only the frequency, but when and how long each request took. Each cell is colored by the most common endpoint at the point in time and duration. By keeping our data granular, we notice many more interesting trends, such as the document/{id}@{version} endpoint with its irregular frequencies, likely a web scraper. Hover over a pixel to see what the most common endpoint was for the given point in time and duration.

<div class="grid grid-cols-1" style="grid-auto-rows: 611px;">
  <div class="card">${resize((width) => ApiHeatmap(heatmaps, {color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route'}))}</div>
</div>

Note, we apply a log scale to our y axis to allow inspection of various endpoints with higher durations. Band begin to appear, endpoints that always have durations within a given range. We also notice intervals of requests, such as lower volumes of requests in the evening hours. We can call out this trend more explicitly by shifting from categorical colors to a sequential scale encoding the frequency of requests at in a given point.

<div class="grid grid-cols-1" style="grid-auto-rows: 611px;">
  <div class="card">${resize((width) => ApiHeatmap(heatmaps, {color, width, title: "Response latency heatmap", label: "Duration (ms)", y1: 0.5, y2: 10_000, yMetric: 'duration_count', fillMetric: 'duration_route', type: 'frequency'}))}</div>
</div>

The sheer volume of requests that happened on midday January 27th become much more apparent with the new color encoding. By visualizing more granular datapoints rather than aggregate trends, we're able to get more insights from our data, allowing more actionable reponses.
