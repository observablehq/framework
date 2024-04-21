```js
import {ApiHeatmap} from "./components/apiHeatmap.js";
import {ApiHistogram} from "./components/apiHistogram.js";
```

# Analyzing web logs

Web logs capture traffic metadata, such as the request time and route, how long the server took to respond, the response size, and so on. Analyzing web logs sheds light on both server performance and client behavior. Yet the common practice of summary statistics (_e.g._, 95th-percentile latency) often hides interesting patterns! This is because performance varies wildly based on the nature of the request, and unusual clients such as bots can easily hide in a sea of “natural” traffic.

What if — instead of summarizing — we plotted _every_ request as a dot with time along *x*→ and latency (on a log scale) along *y*↑?

```js
const latencyHeatmap = FileAttachment("data/latency-heatmap.parquet").parquet();
const latencyByRouteCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency, color by route</h2>
  ${resize((width) => ApiHeatmap(latencyHeatmap.getChild("count"), latencyHeatmap.getChild("route"), {y1: 0.5, y2: 10_000, canvas: latencyByRouteCanvas, color: routeColor, width, label: "Duration (ms)"}))}
</div>

```js
const topRoutesPixel = d3.sort(d3.rollups(latencyHeatmap.getChild("route"), (D) => D.length, (d) => d).filter(([d]) => d), ([, d]) => -d).map(([route, count]) => ({route, count}));
const routeColor = Object.assign(Plot.scale({color: {domain: topRoutesPixel.map((d) => d.route)}}), {label: "route"});
const routeSwatch = (route) => html`<span style="white-space: nowrap;"><svg width=10 height=10 fill=${routeColor.apply(route)}><rect width=10 height=10></rect></svg> <span class="small">${route}</span></span>`;
```

The plot above shows a sample of ${d3.sum(latencyHeatmap.getChild("count")).toLocaleString("en-US")} requests to Observable servers over a 7-day period. Color encodes the associated route. Hover to see the route.

<div class="small note">Since the image is discrete, this scatterplot is effectively a heatmap: each pixel corresponds to a 5-minute time interval and some narrow latency band, while color encodes the most-frequent route within the pixel. There are many routes, so categorical colors are recycled; yet much like political maps, color reveals boundaries.</div>

The detail in this plot is astonishing: it shows the varying performance of different routes, and intriguing temporal patterns. We’ll tease apart these patterns in a bit. First let’s better understand what we’re looking at.

Collapsing *x*→ (time) gives a more traditional view of latency: a stacked histogram colored by route. This view focuses on performance. Notice ${routeSwatch("/documents/@{login}")} tends to be slow (~1 second), and ${routeSwatch("/avatar/{hash}")} tends to vary widely. Performance is contextualized by showing how much traffic routes receive in aggregate: area is proportional to request volume. The popular ${routeSwatch("/d/{id}.js")} and ${routeSwatch("/@{login}/{slug}.js")} routes power [notebook imports](https://observablehq.com/@observablehq/import), so we want them to be fast (and they are).

```js
const latencyHistogram = FileAttachment("data/latency-histogram.parquet").parquet();
const histogramCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency histogram</h2>
  ${resize((width) => ApiHistogram(latencyHistogram.getChild("duration"), latencyHistogram.getChild("count"), latencyHistogram.getChild("route"), {canvas: histogramCanvas, color: routeColor, width, label: "Duration (ms)", y1: 0.5, y2: 10_000}))}
</div>

<div class="small note">The artifacts on the left of the histogram (as well as on the bottom of the heatmap above) are due to the millisecond precision of latency values. Latencies are uniformly jittered by ±0.5ms to smooth (or smear) the data.</div>

Analyzing web logs lets us focus on optimizing routes that are both slow and popular, such as ${routeSwatch("/documents/@{login}")} and ${routeSwatch("/avatar/{hash}")}. We can confirm this by aggregating routes by total count and duration.

```js
const topRoutesCount = visibility().then(() => FileAttachment("data/top-routes-count.parquet").parquet());
const topRoutesDuration = visibility().then(() => FileAttachment("data/top-routes-duration.parquet").parquet());
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

But back to those _temporal_ patterns. These are fascinating because they don’t just show server performance — they show how clients behave “in the wild.”

We can use a dense scatterplot to visualize any quantitative request metric. Below we show response size in bytes along *y*↑. Response sizes are also important for performance, especially if latency measurements only consider the time it takes the server to send the response and not user-perceived latency across the network.

```js
const sizeHeatmap = visibility().then(() => FileAttachment("data/size-heatmap.parquet").parquet());
const sizeByRouteCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response size, color by route</h2>
  ${resize((width) => ApiHeatmap(sizeHeatmap.getChild("count"), sizeHeatmap.getChild("route"), {y1: 400, y2: 160_000, canvas: sizeByRouteCanvas, color: routeColor, width, label: "Size (bytes)"}))}
</div>

The response size heatmap also highlights individual paths, visible as horizontal striations. The ${routeSwatch("/document/@{login}/{slug}")} line at 15,846 bytes represents the [D3 gallery](https://observablehq.com/@d3/gallery), one of the most popular pages on Observable. And the ${routeSwatch("/@{login}/{slug}.js")} line at 12,193 bytes represents [Jeremy’s Inputs](https://observablehq.com/@jashkenas/inputs), a popular import (though superseded by our official [Observable Inputs](https://observablehq.com/framework/lib/inputs)). This heatmap previously revealed a bug where we were loading 200+ notebooks to serve a gallery of only 4–9 notebooks; by fixing the bug, we reduced the total number of >50KB responses by more than half!

The daily pattern for ${routeSwatch("/document/{id}@{version}")} sticks out in this heatmap and on the latency heatmap. What’s going on there? By inspecting logs, we believe this represents an academic research project scraping public notebooks for content analysis. The scraper starts by fetching ${routeSwatch("/documents/public")} ([recent notebooks](https://observablehq.com/recent)) and then repeatedly requests ${routeSwatch("/document/{id}@{version}")} to fetch notebook contents. Once a month, they do a deeper scrape.

By filtering on route, we can see the periodic behavior of the scraper more clearly.

```js
const latencyDocumentsPublicHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-documents-public.parquet").parquet());
const latencyDocumentsPublicCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /documents/{public} and /document/{id}@{version}</h2>
  ${resize((width) => ApiHeatmap(latencyDocumentsPublicHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyDocumentsPublicCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 50]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

<div class="small note">We support visualization research. If you’re interested in studying public notebooks, please reach out and let us help you write a polite scraper.</div>

Above, we color by frequency instead of route. This better reveals the density of requests, though we cannot differentiate routes and therefore infer as much about behavior. Notice the spike in the early morning hours of January 31. By looking at the associated logs, we determined this to be a bot scanning for vulnerabilities.

```js
const latencyCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency, color by frequency</h2>
  ${resize((width) => ApiHeatmap(latencyHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 100]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

Let’s look at a couple more routes of interest. The ${routeSwatch("/avatar/{hash}")} route is responsible for serving avatars (profile images). Avatars are used throughout Observable and this is one of the highest-traffic routes.

```js
const latencyAvatarHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-avatar.parquet").parquet());
const latencyAvatarCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /avatar/{hash}</h2>
  ${resize((width) => ApiHeatmap(latencyAvatarHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyAvatarCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 50]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

Unfortunately, avatars are _slow_. Serving an avatar requires fetching an image for S3 and rescaling to the requested size. S3 is slow, and images are often large and expensive to resize. Furthermore, avatars are often requested in bulk — for example, an activity feed might show hundreds of avatars! The vertical streaks here represent individual clients spawning many simultaneous requests. We have room for improvement here.

The ${routeSwatch("/documents/@{login}")} route is also interesting. It lists the notebooks in the given workspace, such as when you go to your home page, or visit someone’s profile.

```js
const latencyDocumentsAtHeatmap = visibility().then(() => FileAttachment("data/latency-heatmap-documents-at.parquet").parquet());
const latencyDocumentsAtCanvas = document.createElement("canvas");
```

<div class="card">
  <h2>Response latency of /documents/@{login}</h2>
  ${resize((width) => ApiHeatmap(latencyDocumentsAtHeatmap.getChild("count"), null, {y1: 0.5, y2: 10_000, canvas: latencyDocumentsAtCanvas, color: Object.assign(Plot.scale({color: {domain: [0, 30]}}), {label: "frequency"}), width, label: "Duration (ms)"}))}
</div>

This route is slower than we like, mostly due to complicated permissions that make the underlying database queries difficult to index. But the temporal pattern is interesting: at midnight UTC, latency noticeably increases for an hour or two. We believe an internal scheduled batch job is causing resource contention. We want to optimize this route, too.

Web log analysis has been fruitful for the Observable team to prioritize optimization and manage traffic. Using these granular heatmaps, we’ve identified numerous opportunities for improvement that would otherwise go unnoticed.
