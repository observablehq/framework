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
SELECT floor(sqrt(range)), count() FROM range(10, 2278, 2) GROUP BY 1 ORDER BY 2 DESC, 1 DESC LIMIT 10;
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
  let table = _Inputs.table(data, options);

// Duck typing Arrow table
  if (!Array.isArray(data?.schema?.fields)) return container;

  // Get the fields as described by Arrow, in the order given (potentially) by the options.
  const fields = (options.columns?.map(k => data.schema.find(({name}) => name === k)) ?? data.schema.fields).map(({name, type}) => ({name: String(name), type: String(type), values: data.getChild(name)}));

  const container = document.createElement("div");
  container.append(table);
  container.setAttribute("class", "summary-table");
  d3.select(table)
    .style("min-width", `${120 * fields.length}px`)
    .style("max-width", `${280 * fields.length}px`);

  const th = d3.select(container).select("thead").selectAll("th").data([{}, ...fields]);
  th.append("div").classed("type", true).html(({type}) => type);
  const summaries = th.append("div").classed("summary", true);

  const textFields = fields.filter(({type}) => type === "Utf8");
  const footer = html`<footer style="width: 100%; height: 1em;">
    ${textFields.length ? html`<div style="position: absolute; left: 0;"><input type="search" placeholder="Search text fields" onkeyup=${search} onchange=${search}></div>` : ""}
    <div style="position: absolute; right: 0;">${data.numRows.toLocaleString("en-US")} rows</div>
  </footer>`;
  container.appendChild(footer);

  const filters = new Map();

  requestAnimationFrame(() => {
    for (const s of summaries.filter(({type}) => type)) summary(s);
  });
  return container;

  function refresh() {
    const index0 = d3.range(data.length ?? data.numRows);
    let index = index0;
    for (const [, f] of filters) index = index.filter(f);
    table.replaceWith(table = _Inputs.table(index === index0 ? data : take(data, index), options))
  }
  function take(data, index) {
    return Array.from(index, (i) => data.get(i));
  }

  function search() {
    const value = this.value;
    filters.delete("search");
    if (value) {
      try {
        const re = new RegExp(`(^|\b)${value}`, "ui");
        filters.set("search", (i) => textFields.some(({values}) => re.test(values.get(i))));
      } catch(error) {
        console.warn(error);
      }
    }
    refresh();
  }
}

async function summary(div) {
  const {name, type, values} = d3.select(div).datum();
  const {width: w, height} = div.getBoundingClientRect();
  const width = Math.min(200, (w ?? 80));
  let chart;

  // Count values, NaN, nulls, distinct
  // TODO optimize with DuckdB?
  let max = -Infinity;
  let min = Infinity;
  let count = 0;
  let nulls = 0;
  const distinct = new Set();
  const capped = 100; // max number of distinct values to count
  for (const v of values) {
    if (v == null) {nulls++; continue;}
    count++;
    if (min > v) min = v; // note this works for strings too
    if (max < v) max = v;
    if (distinct.size <= capped && !distinct.has(v)) distinct.add(v);
  }

  // categorical
  if (type === "Utf8") {
    const stackOptions = {order: "sum", reverse: true};
    const counts = new Map();
    for (const v of values) {
      if (v == null) continue;
      if (counts.has(v)) counts.set(v, 1 + counts.get(v)); else counts.set(v, 1);
    }
    const topX = d3.sort(counts, ([, c]) => -c).slice(0, 10);
    const visible = new Set(topX.filter(([, c]) => c / count > 0.1).map(([key]) => key));
    // TODO:
    // - if the “others” group has a single value, use it
    // - if a category is already named "Others", use "…" instead
    // - separate the nulls

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
        Plot.barX(values, Plot.stackX(stackOptions, Plot.groupZ({x: "count"}, {z: d => visible.has(d) ? d : "Others", insetRight: 1, fill: "var(--theme-foreground-focus)"}))),
        Plot.text(values, Plot.stackX(stackOptions, Plot.groupZ({x: "count", text: "first"}, {text: d => visible.has(d) ? d : "Others", z: d => visible.has(d) ? d : "Others", fill: "var(--plot-background)"}))),
      ]
    });
  }

  // ordinal
  else if (distinct.size <= 10) {
    const stackOptions = {order: "z"};
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
  // temporal, quantitative
  else {
    const niceK = 5;
    const isDate = type.startsWith("Date");
    const thresholds = Math.max(10, Math.min(50, d3.thresholdScott(values, min, max))); // TODO optimize thresholdScott
    const domain = d3.nice(min, max, niceK);
    if (domain.length > 2) domain.splice(1, domain.length - 2);
    const ticks = isDate ? d3.utcTicks(...domain, niceK) : d3.ticks(...domain, niceK);
    if (ticks.length > 2) ticks.splice(1, ticks.length - 2);
    chart = Plot.plot({
      width,
      height,
      style: "overflow: visible;",
      x: {round: true, nice: niceK},
      y: {axis: null},
      marginLeft: 4,
      marginRight: 12,
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
        domain[0] * domain[1] <= 0 ? Plot.ruleX([0]) : [],
        Plot.ruleY([0]),
        Plot.axisX(ticks, {tickSize: 3, tickPadding: 2, fontSize: 8, ...(!isDate && {tickFormat: "s"})}),
      ]
    });
  }
  div.append(chart ? html`<div style=${type === "Utf8" ? "" : {
    position: "absolute",
    right: 0
  }}>${chart}` : html`<span>Unknown type ${type}`);
}
```

<style>

  .summary-table {max-width: 100%; overflow-x: auto;}
  .summary-table table .type {font-size: smaller; font-weight: normal; color: var(--theme-foreground-muted); height: 1.35em;}
  .summary-table table .summary {font-size: smaller; font-weight: normal; height: 33px;}
  .summary-table footer {font-family: var(--sans-serif); font-size: small; color: var(--theme-foreground-faint)}

</style>
