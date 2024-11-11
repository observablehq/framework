---
theme: dashboard
---

# Observable Plot downloads

```js
import {revive} from "./components/revive.js";
import {Trend} from "./components/trend.js";
import {BurndownPlot} from "./components/burndownPlot.js";
import {DailyPlot} from "./components/dailyPlot.js";
```

```js
const versions = FileAttachment("data/plot-version-data.csv").csv({typed: true});
const downloads = FileAttachment("data/plot-npm-downloads.csv").csv({typed: true});
const issues = FileAttachment("data/plot-github-issues.json").json().then(revive);
const stars = FileAttachment("data/plot-github-stars.csv").csv({typed: true});
```

```js
// These dates are declared globally to ensure consistency across plots.
const end = downloads[0].date;
const start = d3.utcYear.offset(end, -2);
const lastMonth = d3.utcDay.offset(end, -28);
const lastWeek = d3.utcDay.offset(end, -7);
const x = {domain: [start, end]};
```

<div class="grid grid-cols-4">
  <a class="card" href="https://github.com/observablehq/plot/releases" style="color: inherit;">
    <h2>Latest release</h2>
    <span class="big">${versions.at(-1).version}</span>
    <span class="muted">${((days) => days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`)(d3.utcDay.count(versions.at(-1).date, end))}</span>
  </a>
  <a class="card" href="https://github.com/observablehq/plot" style="color: inherit;">
    <h2>GitHub stars</h2>
    <span class="big">${stars.length.toLocaleString("en-US")}</span>
    ${Trend(d3.sum(stars, (d) => d.starred_at >= lastWeek))}</span>
    <span class="muted">over 7d</span>
  </a>
  <a class="card" href="https://npmjs.com/package/@observablehq/plot" style="color: inherit;">
    <h2>Daily npm downloads</h2>
    <span class="big">${downloads[0].value.toLocaleString("en-US")}</span>
    ${Trend(downloads[7].value ? (downloads[0].value - downloads[7].value) / downloads[7].value : undefined, {format: {style: "percent"}})}
    <span class="muted">over 7d</span>
  </a>
  <a class="card" href="https://npmjs.com/package/@observablehq/plot" style="color: inherit;">
    <h2>Total npm downloads</h2>
    <span class="big">${d3.sum(downloads, (d) => d.value).toLocaleString("en-US")}</span>
  </a>
</div>

<div class="card">
  <h2>Daily npm downloads</h2>
  <h3>28d <b style="color: var(--theme-foreground);">—</b> and 7d <b style="color: var(--theme-foreground-focus);">—</b> moving average</h3>
  ${resize((width) =>
    DailyPlot(downloads, {
      width,
      marginRight: 40,
      x,
      y: {insetTop: 40, label: "downloads"},
      annotations: versions.filter((d) => !/-/.test(d.version)).map((d) => ({date: d.date, text: d.version, href: `https://github.com/observablehq/plot/releases/v${d.version}`}))
    })
  )}
</div>

<div class="card">
  <h2>Weekly downloads by version</h2>
  <h3>Last 7d, grouped by major version</h3>
  ${resize((width) =>
    Plot.plot({
      width,
      x: {label: null, round: true, axis: "top"},
      y: {type: "band", reverse: true},
      marginBottom: 0,
      color: {type: "ordinal", scheme: "ylgnbu"},
      marks: [
        Plot.barX(versions, {
          x: "downloads",
          stroke: "white",
          strokeWidth: 0.5,
          y: (d) => d.version.split(".").slice(0, 2).join("."),
          fill: (d) => d.version.split(".").slice(0, 2).join("."),
          tip: {
            channels: {
              version: "version",
              released: (d) => `${d3.utcDay.count(d.date, end).toLocaleString("en-US")} days ago`,
              downloads: "downloads",
            },
            format: {fill: false, x: false, y: false}
          }
        }),
        Plot.ruleX([0]),
        Plot.textX(versions, Plot.stackX({
          x: "downloads",
          y: (d) => d.version.split(".").slice(0, 2).join("."),
          text: (d) => d.downloads > 500 ? d.version : null,
          fill: "white",
          stroke: (d) => d.version.split(".").slice(0, 2).join("."),
          strokeWidth: 5,
          pointerEvents: null
        }))
      ]
    })
  )}
</div>

<div class="grid grid-cols-4">
  <a class="card" href="https://github.com/observablehq/plot/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc" style="color: inherit;">
    <h2>Open issues</h2>
    <span class="big">${d3.sum(issues, (d) => !d.pull_request && d.state === "open").toLocaleString("en-US")}</span>
  </a>
  <a class="card" href="https://github.com/observablehq/plot/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc+draft%3Afalse" style="color: inherit;">
    <h2>Open PRs</h2>
    <span class="big">${d3.sum(issues, (d) => d.pull_request && d.state === "open" && !d.draft).toLocaleString("en-US")}</span>
  </a>
  <a class="card" href="https://github.com/observablehq/plot/issues?q=sort%3Acreated-desc" style="color: inherit;">
    <h2>Recent opened issues</h2>
    <span class="big">${d3.sum(issues, (d) => !d.pull_request && d.open >= lastMonth).toLocaleString("en-US")}</span>
    <span class="muted">in 28d</span>
  </a>
  <a class="card" href="https://github.com/observablehq/plot/issues?q=is%3Aissue+is%3Aclosed+sort%3Aupdated-desc" style="color: inherit;">
    <h2>Recent closed issues</h2>
    <span class="big">${d3.sum(issues, (d) => !d.pull_request && d.close >= lastMonth).toLocaleString("en-US")}</span>
    <span class="muted">in 28d</span>
  </a>
</div>

<div class="grid">
  <div class="card">
    <h2>Open issues over time</h2>
    ${BurndownPlot(issues.filter((d) => !d.pull_request), {x, color: {legend: true, label: "open month"}})}
  </div>
</div>

<div class="grid">
  <div class="card" style="padding: 0;">
    ${Inputs.table(
      issues
        .filter((d) => d.state === "open" && d.reactions.total_count > 5)
        .sort((a, b) => b.reactions.total_count - a.reactions.total_count)
        .map((d) => ({
          "title": {title: d.title, number: d.number},
          "reactions": d.reactions.total_count,
          "days old": d3.utcDay.count(d.created_at, end)
        })),
      {
        width,
        header: {
          title: "Top issues"
        },
        format: {
          title: (d) => html`<a href=https://github.com/observablehq/plot/issues/${d.number} target=_blank>${d.title}</a>`
        }
      }
    )}
  </div>
</div>
