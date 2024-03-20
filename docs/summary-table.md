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
  const fields = (options.columns?.map(k => data.schema.find(({name}) => name === k)) ?? data.schema.fields).map(({name, type}) => ({name: String(name), type: String(type)}));

  const th = d3.select(container).select("thead").selectAll("th").data([{}, ...fields]);
  th.append("div").classed("type", true).html(({type}) => type);
  const summaries = th.append("div").classed("summary", true);
  const footer = html`<footer style="width: 100%; height: 1em;">
    <div style="position: absolute; left: 0;"><!-- <input type="search" placeholder="Search text fields"> --></div>
    <div style="position: absolute; right: 0;">${data.numRows.toLocaleString("en-US")} rows</div>
  </footer>`;
  container.appendChild(footer);

  requestAnimationFrame(() => summaries
    .filter(({type}) => type)
    .append(function({name, type}) {
      return summary(data.getChild(name), type, this.getBoundingClientRect());
    })
  );
  return container;
}

function summary(values, type, {width = 80, height = 33}) {
  let chart;
  if (type.startsWith("Float") || type.startsWith("Date")) {
    chart = Plot.plot({
      width,
      height,
      style: "overflow: visible;",
      x: {round: true},
      y: {axis: null},
      marginLeft: 2,
      marginRight: 2,
      marginTop: 0,
      marginBottom: 13,
      marks: [
        Plot.rectY(values, Plot.binX(undefined, {fill: "var(--theme-foreground-focus)", inset: -.3})),
        Plot.axisX({tickSpacing: 41, tickSize: 3, tickPadding: 2, fontSize: 8}),
      ]
    });

    // restore insets where possible
    const rects = chart.querySelectorAll("rect");
    if (rects.length < 100) {
      for (const rect of rects) {
        rect.setAttribute("x", Math.floor(rect.getAttribute("x")));
        rect.setAttribute("width", Math.max(1, Math.floor(rect.getAttribute("width")) - 1));
      }
    }
  }
  else if (type === "Utf8") {
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
        Plot.barX(values, Plot.groupZ({x: "count"}, {z: Plot.identity, insetRight: 1, fill: "var(--theme-foreground-focus)"})),
        Plot.text(values, Plot.stackX(Plot.groupZ({x: "count", text: "first"}, {z: Plot.identity, fill: "var(--plot-background)"}))),
      ]
    });
  }
  return chart ?? html`<span>Unknown type ${type}`;
}
```

<style>

  table .type {font-size: smaller; font-weight: normal; height: 1.35em;}
  table .summary {font-size: smaller; font-weight: normal; height: 33px;}
  footer {font-family: var(--sans-serif); font-size: small; color: var(--theme-foreground-faint)}

</style>
