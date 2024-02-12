# Primary mortgage market survey

```js
const pmms = FileAttachment("data/pmms.csv").csv({typed: true});
```

```js
const color = Plot.scale({color: {domain: ["30Y FRM", "15Y FRM"]}});
function colorLegend(y) {
  return html`<span style="border-bottom: solid 2px ${color.apply(`${y}Y FRM`)};">${y}-year fixed-rate</span>`;
}
```

```js
const tidy = pmms.flatMap(({date, pmms30, pmms15}) => [{date, rate: pmms30, type: "30Y FRM"}, {date, rate: pmms15, type: "15Y FRM"}]);
const recent = tidy.slice(-53 * 2);
```

```js
function frmCard(y, pmms) {
  const key = `pmms${y}`;
  const fmt = d3.format("+.2");
  const fmt2 = d3.format(".2f");
  const diff1 = pmms.at(-1)[key] - pmms.at(-2)[key];
  const diffY = pmms.at(-1)[key] - pmms.at(-53)[key];
  const range = d3.extent(pmms.slice(-52), d => d[key]);
  const stroke = color.apply(`${y}Y FRM`);
  const rangechart = Plot.plot({
    style: "overflow: visible;",
    width: 300,
    height: 40,
    axis: null,
    x: {inset: 40},
    marks: [
      Plot.tickX(pmms.slice(-52), {
        x: key,
        stroke,
        insetTop: 10,
        insetBottom: 10,
        title: (d) => `${d.date?.toLocaleDateString("en-us")}: ${d[key]}%`,
        tip: {anchor: "bottom"}
      }),
      Plot.tickX(pmms.slice(-1), {x: key, strokeWidth: 2}),
      Plot.text([`${range[0]}%`], {frameAnchor: "left"}),
      Plot.text([`${range[1]}%`], {frameAnchor: "right"})
    ],
    caption: html`<span style="font-size: 11px">52 week range`
  });
  return html`<div class="card">
    <h2 style="color: ${stroke}">${y}Y FRM</b></h2>
    <h1 style="opacity: 0.8;">${pmms.at(-1)[key] ?? "N/A"}%</h1>
    <table class="table">
      <tr><td>1-week change <td>${fmt(diff1)}%<td>${trend(diff1)}
      <tr><td>1-year change <td>${fmt(diffY)}%<td>${trend(diffY)}
      <tr><td>4-week average <td>${fmt2(d3.mean(pmms.slice(-4), d => d[key]))}%<td>
      <tr><td>52-week average <td>${fmt2(d3.mean(pmms.slice(-52), d => d[key]))}%<td>
    </table>
    ${rangechart}
  </div>`;
}

function trend(v) {
  if (Math.abs(v) < 0.01) return "";
  return v > 0 ? html`<span style="color:steelblue">↗︎` : html`<span style="color:orange">↘︎`;
}
```

<style>
  table.table td:not(:first-child) {text-align:right;}
</style>

> _Each week since April 1971 [Freddie Mac](https://www.freddiemac.com/pmms/about-pmms.html) surveys lenders on the rates and points for their most popular ${colorLegend(30)}, ${colorLegend(15)} and other mortgage products._

<div class="grid grid-cols-2" style="max-width: 672px">${frmCard(30, pmms)} ${frmCard(15, pmms)}</div>

<p style="text-align: right; font-style: italic; font-size: smaller;">Data as of ${pmms.at(-1).date?.toLocaleDateString("en-us", {weekday: "long", year: "numeric", month: "short", day: "numeric", timeZone: "UTC"})
}. Source: <a href="https://www.freddiemac.com/pmms">Freddie Mac</a></p>

<p class="card">${Plot.plot({
  title: "Past year",
  height: 250,
  y: {nice: 5, grid: true, label: "rate (%)"},
  color,
  marks: [
    Plot.lineY(recent, {x: "date", y: "rate", stroke: "type", curve: "step", tip: true, markerEnd: true})
  ]
})}</p>

<p class="card">${
Plot.plot({
  title: "Historical data",
  x: {nice: 20},
  y: {grid: true, label: "rate (%)"},
  color,
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(tidy, {x: "date", y: "rate", stroke: "type", tip: true})
  ]
})}</p>
