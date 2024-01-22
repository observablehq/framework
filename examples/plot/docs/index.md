---
toc: false
theme: dashboard
---

# Plot

```js
import {DailyPlot, today, start} from "./components/dailyPlot.js";
```

```js
const versions = FileAttachment("data/plot-version-data.csv").csv({typed: true});
const downloads = FileAttachment("data/plot-npm-downloads.csv").csv({typed: true});
const issues = FileAttachment("data/plot-github-issues.json").json().then((data) => data.map((d) => (d.open = d3.utcDay(new Date(d.created_at)), d.close = d.closed_at ? d3.utcDay(new Date(d.closed_at)) : null, d)));
const stars = FileAttachment("data/plot-github-stars.csv").csv({typed: true});
```

```js
const lastMonth = d3.utcDay.offset(today, -28);
const lastWeek = d3.utcDay.offset(today, -7);
const x = {domain: [start, today]};
const format = d3.format(",");
```

```js
const burndown = issues
  .filter((d) => !d.pull_request)
  .flatMap((issue) => Array.from(d3.utcDay.range(
      d3.utcDay.offset(Math.max(start, issue.open), -1),
      d3.utcDay.offset(issue.close ?? today, 2)
    ), (date) => ({
        date,
        id: issue.number,
        open: issue.open,
        title: `#${issue.number}: ${issue.title}\n\nOpened ${
          issue.open.toISOString().slice(0,10)}${
            issue.close ? `\nClosed ${issue.close.toISOString().slice(0,10)}` : ""
        }`
      })
    )
  );
```

<div class="grid grid-cols-4" style="grid-auto-rows: 86px;">
  <div class=card>
    <h2>Current release</h2>
    ${html`<a href="https://github.com/observablehq/plot/releases/tag/v${versions.at(-1).version}" class="big" style="color: inherit;">${versions.at(-1).version}`}
    <span class="muted">${(d => d === 0 ? "today" : d===1 ? "yesterday" : `${d} days ago`)(d3.utcDay.count(versions.at(-1).date, Date.now()))}</span>
  </div>
  <div class=card>
    <h2>GitHub stars</h2>
    <span class="big">${format(stars.length)}</span>
    <span class="green" title="Since last week">+${format(stars.filter((d) => d.starred_at >= lastWeek).length)}</span>
  </div>
  <div class=card>
    <h2>Daily npm downloads</h2>
    <span class="big">${format(downloads[0].value)}</span>
    ${((trend) => html`<span class="${
      trend > 0 ? "green" : trend < 0 ? "red" : "muted"
    }" title="Compared to last week">${d3.format("+.1%")(trend)}`)(
      downloads[7].value ? (downloads[0].value - downloads[7].value) / downloads[7].value : undefined
    )}
  </div>
  <div class=card>
    <h2>Total npm downloads</h2>
    <span class="big">${format(d3.sum(downloads, (d) => d.value))}</span>
  </div>
</div>

<div class="card grid grid-cols-1" style="grid-auto-rows: calc(260px + 2rem);">
  ${resize((width, height) => DailyPlot(downloads, {width, height, title: "Daily npm downloads", label: "downloads", domain: [0, 6000], versions}))}
</div>

<div class="card grid grid-cols-1">
  ${resize((width) => Plot.plot({
    width,
    caption: "Downloads per version (last 7 days)",
    x: {label: null, tickFormat: "s", round: true, axis: "top"},
    y: {type: "band", reverse: true},
    marginTop: 20,
    marginBottom: 0,
    color: {type: "categorical", scheme: "ylgnbu"},
    marks: [
      Plot.barX(versions, {
        x: "downloads",
        stroke: "white",
        strokeWidth: 0.5,
        y: d => d.version.split(".").slice(0,2).join("."),
        fill: d => d.version.split(".").slice(0,2).join("."),
        tip: {
          channels: {
            version: "version",
            released: d => `${d3.utcDay.count(d.date, Date.now())} days ago`,
            downloads: "downloads",
          },
          format: {fill: false, x: false, y: false}
        }
      }),
      Plot.textX(versions, Plot.stackX({
        x: "downloads",
        y: d => d.version.split(".").slice(0,2).join("."),
        text: d => d.downloads > 500 ? d.version : null,
        fill: "white",
        stroke: d => d.version.split(".").slice(0,2).join("."),
        strokeWidth: 5,
        pointerEvents: null
      }))
    ]
  })
)}
</div>

<div class="grid grid-cols-4" style="grid-auto-rows: 86px;">
  <div class=card>
    <h2>Open issues</h2>
    <a class="big" href="https://github.com/observablehq/plot/issues" style="color: inherit;">${format(issues.filter((d) => !d.pull_request && d.state === "open").length)}</a>
  </div>
  <div class=card>
    <h2>Opened issues, 28d</h2>
    <span class="big">${format(issues.filter((d) => !d.pull_request && d.open >= lastMonth).length)}</span>
  </div>
  <div class=card>
    <h2>Closed issues, 28d</h2>
    <span class="big">${format(issues.filter((d) => !d.pull_request && d.close >= lastMonth).length)}</span>
  </div>
  <div class=card>
    <h2>Open PRs</h2>
    <a class="big" href="https://github.com/observablehq/plot/pulls?q=is%3Apr+is%3Aopen+draft%3Afalse" style="color: inherit;">${format(issues.filter((d) => d.pull_request && d.state === "open" && !d.draft).length)}</a>
  </div>
</div>

<div class="grid grid-cols-2" style="grid-auto-rows: 276px;">
  <div class="card">${resize((width, height) => Plot.plot({
    width,
    height,
    marginLeft: 0,
    marginRight: 30,
    round: true,
    x,
    y: {axis: "right", grid: true, label: "↑ Open issues"},
    marks: [
      Plot.areaY(burndown, {
        x: "date",
        y: 1,
        curve: "step-before",
        fill: "open",
        z: "id",
        title: "title",
        tip: true
      }),
      Plot.ruleY([0])
    ]
  }))}</div>
  <div class="card" style="padding: 0;">${
    Inputs.table(
      issues
        .filter((d) => d.state === "open" && d.reactions.total_count > 5)
        .sort((a, b) => b.reactions.total_count - a.reactions.total_count)
        .map((d) => ({
          "title": {title: d.title, number: d.number},
          "reactions": d.reactions.total_count,
          "days old": d3.utcDay.count(d.open, today)
        })),
      {
        format: {
          title: (d) => html`<a href=https://github.com/observablehq/plot/issues/${d.number} target=_blank>${d.title}</a>`
        }
      }
    )
  }</div>
</div>

<!--
TODO
- count number of recent issue comments & reactions
- show npm downloads by day of week
- show the size of the bundle, or lines of source code over time
- show [jsDelivr stats](https://www.jsdelivr.com/package/npm/@observablehq/plot?tab=stats)
- show recent GitHub commit activity
-->
