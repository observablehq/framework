# SQL summary table ([#23](https://github.com/observablehq/framework/issues/23))

```sql echo
SELECT * FROM aapl;
```

```sql echo
SELECT * FROM gaia;
```

```sql echo
SELECT * FROM penguins;
```

```sql echo
SELECT a::int
     , b::int
     , (a * b)::int as p
  FROM generate_series(1, 9) as s(a)
     , generate_series(1, 9) as t(b);
```

```sql echo
FROM range(10, 22, 2);
```

```sql echo
SELECT range * pi() as pi FROM range(10);
```

```sql echo
SELECT cos(range * pi() / 10) as x, sin(range * pi() / 10) as y FROM range(0, 20, 1);
```

```js echo
const sql = DuckDBClient.sql({aapl, penguins, gaia: FileAttachment("/lib/gaia-sample.parquet")});
```

```js echo
import * as _Inputs from "npm:@observablehq/inputs"
import * as Arrow from "npm:apache-arrow";
import * as d3 from "npm:d3";
import {html} from "npm:htl";

width; // refresh when resized

const Inputs = ({..._Inputs, table})

function table(data, options = {}) {
  if (!data) return data;

  const container = document.createElement("div");
  container.append(_Inputs.table(data, options));

  // Duck typing Arrow table
  if (!Array.isArray(data?.schema?.fields)) return container;

  // Get the fields as described by Arrow, in the order given (potentially) by the options.
  const fields = (options.columns?.map(k => data.schema.find(({name}) => name === k)) ?? data.schema.fields).map(({name, type}) => ({name: String(name), type: String(type), values: data.getChild(name)}));

  const th = d3.select(container).select("thead").selectAll("th").data([{}, ...fields]);
  th.append("div").classed("type", true).html(({type}) => type);
  const summaries = th.append("div").classed("summary", true);
  const footer = html`<footer style="width: 100%; height: 1em;">
    <div style="position: absolute; left: 0;"><!-- <input type="search" placeholder="Search text fields"> --></div>
    <div style="position: absolute; right: 0;">${data.numRows.toLocaleString("en-US")} rows</div>
  </footer>`;
  container.appendChild(footer);

  requestAnimationFrame(() => summaries.filter(({type}) => type).append(summary));
  return container;
}

function summary({name, type, values}) {
  const {width: w, height} = this.getBoundingClientRect();
  const width = Math.min(200, (w ?? 80) - 10);
  let chart;

  // Count values, NaN, nulls, distinct
  // TODO use DuckdB?
  let max = -Infinity;
  let min = Infinity;
  let nulls = 0;
  const distinct = new Set();
  const capped = 100; // max number of distinct values to count
  for (const v of values) {
    if (v == null) {nulls++; continue;}
    if (min > v) min = v; // note this works for strings too
    if (max < v) max = v;
    if (distinct.size <= capped && !distinct.has(v)) distinct.add(v);
  }

  if (distinct.size <= 10 || type === "Utf8") {
    const stackOptions = (type === "Utf8") ? {order: "sum", reverse: true} : {order: "value"};
    chart = Plot.plot({
      width,
      height,
      style: "overflow: visible;",
      x: {axis: null},
      y: {axis: null},
      marginLeft: 2,
      marginRight: 2,
      marginTop: 0,
      marginBottom: 13,
      marks: [
        Plot.barX(values, Plot.stackX(stackOptions, Plot.groupZ({x: "count"}, {z: Plot.identity, insetRight: 1, fill: "var(--theme-foreground-focus)"}))),
        Plot.text(values, Plot.stackX(stackOptions, Plot.groupZ({x: "count", text: "first"}, {z: Plot.identity, fill: "var(--plot-background)"}))),
      ]
    });
  }
  else {
    const thresholds = Math.max(10, Math.min(50, d3.thresholdScott(values, min, max))); // TODO optimize thresholdScott
    chart = Plot.plot({
      width,
      height,
      style: "overflow: visible;",
      x: {
        round: true,
        nice: true
      },
      y: {axis: null},
      marginLeft: 9,
      marginRight: 9,
      marginTop: 0,
      marginBottom: 13,
      marks: [
        thresholds > 20 ?
        Plot.areaY(values, Plot.binX(undefined, {
          fill: "var(--theme-foreground-focus)",
          thresholds
        })) :
        Plot.rectY(values, Plot.binX(undefined, {
          fill: "var(--theme-foreground-focus)",
          thresholds,
          inset: 0,
          insetRight: 1,
        })),
        min * max <= 0 ? Plot.ruleX([0]) : [],
        Plot.ruleY([0]),
        Plot.axisX({tickSpacing: 41, tickSize: 3, tickPadding: 2, fontSize: 8, ...(!type.startsWith("Date") && Math.max(Math.abs(min), Math.abs(max)) >= 1e5 && {tickFormat: "s"})}),
      ]
    });
  }
  return chart ? html`<div style=${type === "Utf8" ? "" : {
    position: "absolute",
    right: 0
  }}>${chart}` : html`<span>Unknown type ${type}`;
}
```

<style>

  table .type {font-size: smaller; font-weight: normal; height: 1.35em;}
  table .summary {font-size: smaller; font-weight: normal; height: 33px;}
  footer {font-family: var(--sans-serif); font-size: small; color: var(--theme-foreground-faint)}

</style>
