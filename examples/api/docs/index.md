---
toc: false
---

```js
import {ApiHeatmap} from "./components/apiHeatmap.js";
import {ApiHistogram} from "./components/apiHistogram.js";
```

```js
const latencyHeatmap = FileAttachment("data/latency-heatmap.arrow").arrow();
```

```js
const topRoutesPixel = d3.sort(d3.rollups(latencyHeatmap.getChild("route"), (D) => D.length, (d) => d).filter(([d]) => d), ([, d]) => -d).map(([route, count]) => ({route, count}));
const routeColor = Object.assign(Plot.scale({color: {domain: topRoutesPixel.map((d) => d.route)}}), {label: "route"});
const routeSwatch = (route) => html`<span style="white-space: nowrap;"><svg width=10 height=10 fill=${routeColor.apply(route)}><rect width=10 height=10></rect></svg> <span class="small">${route}</span></span>`;
```

# Analyzing web logs

Web logs capture traffic metadata, such as the request time, how long the server took to respond, response size in bytes, route, and so on. Analyzing web logs sheds light on both server performance and client behavior. Yet summary statistics (_e.g._, 95th-percentile latency) often hide interesting patterns! This is because performance varies wildly based on the nature of the request, and unusual clients such as bots can easily hide in a sea of “natural” traffic.

What if — instead of summarizing — we plotted _every_ request as a dot with time along *x*→ and latency (on a log scale) along *y*↑?

```js
const latencyByRouteCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency, color by route</h2>
  ${resize((width) => ApiHeatmap(latencyHeatmap.getChild("count"), latencyHeatmap.getChild("route"), {y1: 0.5, y2: 10_000, canvas: latencyByRouteCanvas, color: routeColor, width, label: "Duration (ms)"}))}
</div>

The plot above shows a sample of ${d3.sum(latencyHeatmap.getChild("count")).toLocaleString("en-US")} requests to Observable servers over a 7-day period. Each dot is colored by the associated route. Hover to see the route.

<div class="note small">
  Since the image is discrete, this scatterplot is effectively a heatmap: each pixel corresponds to a 5-minute time interval and some narrow latency band, while color encodes the most-frequent route within the pixel. There are many routes, so categorical colors are recycled; yet much like political maps, color reveals boundaries.
</div>

The detail in this plot is astonishing: we get a sense of the varying performance of different routes, and see intriguing temporal patterns in requests. We’ll tease apart these patterns in a bit. First let’s better understand what we’re looking at.

If we collapse *x*→ (time), we get a more traditional view of latency: a stacked histogram colored by route. This view focuses on server performance: for example, ${routeSwatch("/documents/@{login}")} requests tend to be slow (~1 second), and ${routeSwatch("/avatar/{hash}")} latencies tend to vary widely. But it also puts this performance in context by showing how much traffic routes receive in aggregate: the popular ${routeSwatch("/d/{id}.js")} and ${routeSwatch("/@{login}/{slug}.js")} routes power [notebook imports](https://observablehq.com/@observablehq/import).

```js
const latencyHistogram = FileAttachment("data/latency-histogram.arrow").arrow();
const histogramCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency histogram</h2>
  ${resize((width) => ApiHistogram(latencyHistogram.getChild("duration"), latencyHistogram.getChild("count"), latencyHistogram.getChild("route"), {canvas: histogramCanvas, color: routeColor, width, label: "Duration (ms)", y1: 0.5, y2: 10_000}))}
</div>

<div class="note small">The artifacts on the left side of the histogram (as well as on the bottom of the heatmap above) are due to the millisecond precision of latency values. Latencies are randomly jittered by ±0.5ms to smooth (or smear) the data.</div>

The histogram suggests where we should focus our optimization efforts by focusing on routes that are both slow and popular, such as ${routeSwatch("/documents/@{login}")} and ${routeSwatch("/avatar/{hash}")}. We can confirm this by aggregating routes by total count and duration, though these bar charts give a more reductive summary.

```js
const topRoutesCount = visibility().then(() => FileAttachment("data/top-routes-count.arrow").arrow());
const topRoutesDuration = visibility().then(() => FileAttachment("data/top-routes-duration.arrow").arrow());
```

<div class="grid grid-cols-2">
  <div class="card">
    <h2>Top routes by total count</h2>
    ${resize((width) => Plot.plot({
      width,
      marginLeft: 10,
      x: {axis: "top", labelAnchor: "left", grid: true, insetRight: 90, transform: (d) => d / 1000, label: "Requests (thousands)"},
      y: {axis: null, round: false},
      color: routeColor,
      marks: [
        Plot.rectX(topRoutesCount, {x: "count", y: "route", fill: "route", sort: {y: "-x", limit: 10}}),
        Plot.ruleX([0]),
        Plot.text(topRoutesCount, {x: "count", y: "route", dx: -6, text: (d) => d.count / 1000, fill: "var(--theme-background)", frameAnchor: "right"}),
        Plot.text(topRoutesCount, {x: "count", y: "route", dx: 6, text: "route", frameAnchor: "left"})
      ]
    }))}
  </div>
  <div class="card">
    <h2>Top routes by total duration</h2>
    ${resize((width) => Plot.plot({
      width,
      marginLeft: 10,
      x: {axis: "top", labelAnchor: "left", grid: true, insetRight: 90, transform: (d) => d / (1000 * 60 * 60), label: "Duration (hours)"},
      y: {axis: null, round: false},
      color: routeColor,
      marks: [
        Plot.rectX(topRoutesDuration, {x: "duration", y: "route", fill: "route", sort: {y: "-x", limit: 10}}),
        Plot.ruleX([0]),
        Plot.text(topRoutesDuration, {x: "duration", y: "route", dx: -6, text: (d) => d.duration / (1000 * 60 * 60), fill: "var(--theme-background)", frameAnchor: "right"}),
        Plot.text(topRoutesDuration, {x: "duration", y: "route", dx: 6, text: "route", frameAnchor: "left"})
      ]
    }))}
  </div>
</div>

But let’s get back to those _temporal_ patterns. These are much more interesting because they don’t just show the performance of our servers — they show how clients “in the wild” make requests.

We can use the same technique to look at response _size_.

```js
const sizeHeatmap = visibility().then(() => FileAttachment("data/size-heatmap.arrow").arrow());
const sizeByRouteCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response size, color by route</h2>
  ${resize((width) => ApiHeatmap(sizeHeatmap.getChild("count"), sizeHeatmap.getChild("route"), {y1: 400, y2: 160_000, canvas: sizeByRouteCanvas, color: routeColor, width, label: "Size (bytes)"}))}
</div>

Again the daily research scraper for ${routeSwatch("/document/{id}@{version}")}  is highly visible.

The horizontal striations represent specific paths. The ${routeSwatch("/document/@{login}/{slug}")} line at 15,846 bytes represents the [D3 gallery](https://observablehq.com/@d3/gallery), one of the most popular pages on Observable. The ${routeSwatch("/@{login}/{slug}.js")} line at 12,193 bytes represents [Jeremy’s Inputs](https://observablehq.com/@jashkenas/inputs), a popular collection of importable input components (though now we recommend you use the official [Observable Inputs](https://observablehq.com/framework/lib/inputs) instead).

What if we don’t color by route? Now we color by frequency, and we can more easily see the density of requests. Still useful for getting a sense of overall traffic, but far less informative than coloring by route, since we can’t tease apart patterns in the data. This is a more traditional heatmap.

```js
const latencyCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency, color by frequency</h2>
  ${resize((width) => ApiHeatmap(latencyHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 100]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

But coloring by frequency works well when filtering by route.

What if we just look at ${routeSwatch("/avatar/{hash}")}?

```js
const latencyAvatarHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-avatar.arrow").arrow());
const latencyAvatarCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /avatar/{hash}</h2>
  ${resize((width) => ApiHeatmap(latencyAvatarHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyAvatarCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 100]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

Avatars are _slow_. They have to fetch an image for S3 and rescale it based on the requested size. Talking to S3 is slow, and images can be large and are comparatively expensive to resize. Furthermore, avatars are often requested in bulk — for example, visiting an activity feed might need to show a hundred avatars or more. The vertical requests likely represent a single user spawning many simultaneous requests. There is clearly major room for improvement here (even though we already have extensive CDN caching).

Let’s try something else. What if we just look at ${routeSwatch("/documents/public")} (upper band) and ${routeSwatch("/document/{id}@{version}")} (lower band)? This has a strong daily pattern — with extra activity before the first of the month. What is going on here?

```js
const latencyDocumentsPublicHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-documents-public.arrow").arrow());
const latencyDocumentsPublicCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /documents/{public} and /document/{id}@{version}</h2>
  ${resize((width) => ApiHeatmap(latencyDocumentsPublicHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyDocumentsPublicCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 100]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

We investigated the associated IP addresses with these requests, and determined an educational institution scraping public notebooks, presumably for research (content analysis) or for archival purposes. At the end of each month, they do a longer scrape of more pages. While we generally support visualization research, we may get in touch with this project to ensure the automated traffic doesn’t impact performance for other Observable users.

What if we just look at ${routeSwatch("/documents/@{login}")}? This route lists notebooks for an individual user, such as when you go to your home page, or visit someone’s profile.

```js
const latencyDocumentsAtHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-documents-at.arrow").arrow());
const latencyDocumentsAtCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /documents/@{login}</h2>
  ${resize((width) => ApiHeatmap(latencyDocumentsAtHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyDocumentsAtCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 100]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

This route is also slower than it should be, mostly due to complicated permissions. But the temporal pattern is interesting: at midnight UTC, latency noticeably increases for an hour or two. This is likely a scheduled batch job causing resource contention.

Web log analysis has been fruitful for the Observable team to prioritize optimization and block undesirable traffic. With the heatmap visualization, we identified a route called 1,000+ times a day — not enough to be considered a “top” route — but that still accounted for >50% of all requests over 50KB! We were erroneously loading 200 notebooks when we only needed 9. Through granular views, we’re able to identify opportunities for improvement that would otherwise go unnoticed.
