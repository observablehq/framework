---
sql:
  commits: data/commits.parquet
---

# GitHub: ${repo.nameWithOwner}

This dashboard shows the structure and recent activity of the **${repo.nameWithOwner}** GitHub repository: _“${stripTags(repo.descriptionHTML)}”_

## Development

_Recent issues and pull requests._

<div class="card grid grid-cols-1">${resize(issuesPlot)}</div>

_Recent commits_

<div class="card grid grid-cols-1">${commitsPlot(width, [d3.utcMonth.offset(new Date(), -12), new Date()])}</div>

_Recent comments_

<div class="card grid grid-cols-1">${resize(commentsPlot)}</div>

## Overview

<div class="grid grid-cols-2">
  <div class="card">${BigNumber(repo.stargazerCount, {title: "stars"})}</div>
  <div class="card if-downloads">${BigNumber(d3.sum(downloads, d => d.value), {title: "npm downloads"})}</div>
</div>

<div class="grid grid-cols-1 if-downloads" style="grid-auto-rows: calc(250px + 2rem);">
  <div class="card">${resize((width) => DailyPlot(downloads, {width, title: "Daily npm downloads", label: "downloads"}))}</div>
  ${downloads.length === 0 ? html`<style>.if-downloads {display: none;}</style>` : ""}

</div>

<div class="grid grid-cols-2">
  <div class="card">${BigNumber(repo.defaultBranchRef?.target?.history?.totalCount ?? commits.length, {title: "commits"})}</div>
  <div class="card">${BigNumber(authors.length, {title: "contributors"})}</div>
</div>

<div class="card grid grid-cols-1">${commitsPlot(width)}</div>

<div class="card grid grid-cols-1">${impactPlot(width)}</div>

## Files

<div class="grid grid-cols-2">
  <div class="card">${BigNumber(d3.count(files, (d) => d.size), {title: "Number of files"})}</div>
  <div class="card">${BigNumber(files.size, {title: "Total bytes"})}</div>
</div>

<div class="grid grid-cols-1 card">${resize(width => filesChart(width, files))}</div>

## Issues

_Burndown chart._

<div class="card grid grid-cols-1">${
  resize((width) => burndownChart(width))}
</div>

_Most commented issues._

<div class="grid grid-cols-1" style="grid-auto-rows: 276px;">
    <div class="card" style="padding: 0;">${
    Inputs.table(
      issues
        .filter((d) => d.state === "open" && d.reactions > 5)
        .sort((a, b) => b.reactions - a.reactions)
        .map((d) => ({
          "title": {title: d.title, number: d.number},
          "reactions": d.reactions,
          "days old": d3.utcDay.count(new Date(d.created_at), today)
        })),
      {
        format: {
          title: (d) => html`<a href="https://github.com/observablehq/plot/issues/${d.number}""target="_blank">${d.title}</a>`
        }
      }
    )
  }</div>
</div>

<!-- DATA -->

```js
const repo = FileAttachment("data/repo.json").json();
```

```js
const downloads = FileAttachment("data/npm-downloads.csv").csv({ typed: true });
```

```js
const comments = await FileAttachment("data/comments.json").json();
for (const c of comments) c.date = new Date(c.date);
```

```js
const authors = Array.from(
  await sql`SELECT author, COUNT() AS c FROM commits GROUP BY 1 ORDER BY 2 DESC`,
  ({ author }) => author
);
const commits = sql`
SELECT author AS author_name
     , date
  FROM commits
 ORDER BY 2
`;
```

```js
const impact = sql`SELECT hash, author, date, files, insertions, deletions FROM commits;`;
```

```js
const issues = await FileAttachment("data/issues.json").json();
for (const i of issues) {
  i.date = new Date(i.created_at);
  i.type = i.pull_request ? "PR" : "issue";
}
```

```js
const span = 92; // days
const today = d3.utcDay.offset(d3.utcDay(Date.now()), 1);
const lastWeek = d3.utcDay.offset(today, -7);
const start = d3.utcDay.offset(today, -span);
```

<!-- ISSUES CHART -->

```js
const recentIssues = d3.sort(
  issues.filter((d) => d.date > start),
  (d) => !d.closed_at
);
const domain = d3.groupSort(
  recentIssues,
  (v) => -v.length,
  (d) => d.user
);
if (domain.length > 10)
  domain.splice(9, domain.length, [`${domain.length - 9} others`]);
const color = Plot.scale({
  color: { domain, unknown: d3.schemeObservable10[9] },
});
```

```js
function issuesPlot(width) {
  return Plot.plot({
    width,
    style: "overflow: visible",
    x: { domain: [start, today], interval: "day", inset: 10 },
    y: { axis: null },
    color: { ...color, legend: true },
    opacity: { label: "status" },
    symbol: { range: ["square", "circle"], legend: true },
    aspectRatio: 1 / (24 * 3600 * 1000),
    marks: [
      Plot.ruleY([0]),
      Plot.dotX(
        recentIssues,
        Plot.stackY2({
          x: "date",
          stroke: "user",
          fill: "user",
          y: (d) => (d.type === "PR" ? 1 : -1),
          symbol: "type",
          fillOpacity: (d) => !!d.closed_at,
          r: (width - 40) / span / 3,
          href: "url",
          target: "_blank",
          tip: {
            channels: {
              name: "title",
              closed: (d) => !!d.closed_at,
            },
            format: {
              y: false,
              fillOpacity: false,
            },
          },
        })
      ),
    ],
  });
}
```

<!-- COMMENTS CHART -->

```js
function commentsPlot(width) {
  const options = {
    width,
    height: 0,
    x: { domain: [start, today], inset: 10 },
    style: "overflow: hidden",
    color,
    marks: [
      Plot.frame({ anchor: "bottom" }),
      Plot.dotX(
        comments,
        Plot.dodgeY({
          filter: (d) => d.date > start,
          sort: "date",
          x: "date",
          fill: "login",
          r: 2.5,
          href: "html_url",
          target: "_blank",
          tip: {
            channels: {
              about: (d) => d.html_url.match(/((issues|pull)\/\d+)/)?.[1],
              body: "body",
            },
          },
        })
      ),
    ],
  };
  const height = Math.min(
    500,
    10 +
      d3.max(
        d3.select(Plot.plot(options)).selectAll("circle"),
        (d) => -d.getAttribute("cy")
      )
  );
  return Plot.plot({ ...options, height });
}
```

<!-- FILES CHART -->

```js
const rawfiles = FileAttachment("data/files.json").json();
import { Treemap } from "/components/treemap.js";
import { Swatches } from "/components/color-legend.js";
```

```js
const files = rawfiles;
files.size = d3.sum(rawfiles, (d) => d.size);
```

```js
function filesChart(width, files) {
  const chart = Treemap(files, {
    path: (d) => d.path,
    width,
    label: (d) =>
      `${d.path.split("/").pop()}\n${d.size?.toLocaleString("en-US")}`,
    value: (d) => d.size,
    height: width,
    group: (d) =>
      `${d.path.split("/").slice(0, -1).slice(0, 2).join("/") || "/"}`,
  });

  return html`<div class="swatches">
      ${Swatches(
        chart.scales.color.domain(chart.scales.color.domain().slice(0, 9))
      )}
    </div>
    <style>
      .swatches span::before {
        opacity: 0.7;
      }
    </style>
    ${chart}`;
}
```

<!-- ISSUES BURNDOWN CHART -->

```js
const cohorts = 50;

const startB = d3.min(issues, (d) => new Date(d.created_at));

const burndown = d3
  .bin()
  .thresholds(d3.utcTicks(startB, today, cohorts))
  .value((d) => new Date(d.created_at))(issues)
  .map((bin) =>
    bin.map((d) => {
      const created = new Date(d.created_at);
      const a = { cohort: bin.x0, date: created, count: 1 };
      const closed = new Date(d.closed_at ?? NaN);
      return [a, { ...a, date: closed, count: -1 }];
    })
  )
  .flat(2);

const burndownChart = (width) =>
  Plot.plot({
    width,
    marginRight: 60,
    color: { type: "utc", legend: true, label: "date opened" },
    x: { type: "utc", domain: [startB, today] },
    y: { axis: "right", grid: true, label: "↑ Open issues" },
    marks: [
      Plot.areaY(
        burndown,
        Plot.mapY(
          "cumsum",
          Plot.binX(
            { y: "sum", thresholds: 500, filter: null },
            {
              x: "date",
              fill: "cohort",
              stroke: "cohort",
              strokeWidth: 0.5,
              y: "count",
              curve: "step-after",
              clip: "frame",
              // filter out shallow segments during stacking
              offset: (I, X1, X2) =>
                I.flat(2).forEach((i) => X2[i] === X1[i] && (X2[i] = NaN)),
              tip: {
                format: {
                  y: (d) => d,
                  x: (d) => d3.isoFormat(d).slice(0, 10),
                  fill: (d) => d3.isoFormat(d).slice(0, 7),
                },
              },
            }
          )
        )
      ),
      Plot.ruleY([0]),
    ],
  });
```

```js
import { BigNumber } from "./components/bigNumber.js";
import { DailyPlot } from "./components/dailyPlot.js";

const stripTags = (html) =>
  new DOMParser().parseFromString(html, "text/html")?.body.textContent ?? "";
```

```js
function commitsPlot(width, domain) {
  const top_names = new Set(authors.slice(0, 18));
  const author_domain =
    authors.length > 18 ? [...top_names, "Others"] : authors;
  const range = [
    ...d3.schemeObservable10.slice(0, 9),
    ...d3.schemeObservable10.slice(0, 9),
  ]
    .slice(0, top_names.size)
    .concat(d3.schemeObservable10[9]);
  return Plot.plot({
    width,
    x: { type: "utc" },
    color: {
      domain: author_domain,
      range,
    },
    marks: [
      Plot.rectY(
        commits,
        Plot.binX(undefined, {
          x: "date",
          title: "author_name",
          fill: (d) =>
            top_names.has(d.author_name) ? d.author_name : "Others",
          order: [...top_names],
          domain,
          thresholds: 70,
          tip: true,
        })
      ),
    ],
  });
}
```

```js
function impactPlot(width) {
  const cumulative = Plot.rectY(
    impact,
    Plot.mapY(
      "cumsum",
      Plot.binX(
        { y: "sum" },
        {
          x: "date",
          y: (d) => (d.insertions ?? 0) - (d.deletions ?? 0),
          interval: "month",
        }
      )
    )
  );
  cumulative.initialize();
  const cumsumY = cumulative.channels.y2.value.transform();
  const shiftY = (y) => y.map((d, i) => d + (i ? cumsumY[i - 1] : 0));

  return Plot.plot({
    width,
    y: { tickFormat: "s", grid: true },
    color: { legend: true, range: ["hsl(80,50%,60%)", "hsl(0,100%,70%)"] },
    marks: [
      Plot.ruleY([0]),
      Plot.rectY(
        impact,
        Plot.map(
          { y1: shiftY, y2: shiftY },
          Plot.binX(
            { y2: "sum", y1: () => 0 },
            {
              x: "date",
              y: "insertions",
              fill: () => "+ lines added",
              interval: "month",
            }
          )
        )
      ),
      Plot.rectY(
        impact,
        Plot.map(
          { y1: shiftY, y2: shiftY },
          Plot.binX(
            { y2: "sum", y1: () => 0 },
            {
              x: "date",
              y: (d) => -d.deletions,
              fill: () => "− lines deleted",
              interval: "month",
            }
          )
        )
      ),
    ],
  });
}
```
