<style type="text/css">

/* Full-width tables are too wide with only one or two columns. */
form.inputs-3a86ea-table {
  max-width: 640px;
}

</style>

# Arquero

[Arquero](https://uwdata.github.io/arquero/) is a JavaScript library for “query processing and transformation of array-backed data tables.” Arquero is available by default as `aq` in Markdown, but you can import it explicitly like so:

```js run=false
import * as aq from "npm:arquero";
```

Following the documentation website’s [introduction](https://uwdata.github.io/arquero/), let’s create a table of the Average hours of sunshine per month, from [usclimatedata.com](https://usclimatedata.com/).

```js echo
const dt = aq.table({
  "Seattle": [69, 108, 178, 207, 253, 268, 312, 281, 221, 142, 72, 52],
  "Chicago": [135, 136, 187, 215, 281, 311, 318, 283, 226, 193, 113, 106],
  "San Francisco": [165, 182, 251, 281, 314, 330, 300, 272, 267, 243, 189, 156]
});
```

Arquero is column-oriented: each column is an array of values of a given type. Here, numbers representing hours of sunshine per month. But an Arquero table is also iterable and as such, its contents can be displayed with [`Inputs.table`](/lib/inputs#table).

```js echo
Inputs.table(dt)
```

An Arquero table can also be used to make charts with [Observable Plot](./plot):

```js echo
Plot.plot({
  x: {tickFormat: Plot.formatMonth()},
  y: {grid: true, label: "Hours of sunshine ☀️ per month"},
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(dt, {y: "Seattle", marker: true, stroke: "red"}),
    Plot.lineY(dt, {y: "Chicago", marker: true, stroke: "turquoise"}),
    Plot.lineY(dt, {y: "San Francisco", marker: true, stroke: "orange"})
  ]
})
```

Arquero supports a range of data transformation tasks, including filter, sample, aggregation, window, join, and reshaping operations. For example, the following operation derives differences between Seattle and Chicago and sorts the months accordingly.

```js echo
Inputs.table(
  dt.derive({
      month: (d) => aq.op.row_number(),
      diff: (d) => d.Seattle - d.Chicago
    })
    .select("month", "diff")
    .orderby(aq.desc("diff"))
)
```

Is Seattle more correlated with San Francisco or Chicago?

```js echo
Inputs.table(
  dt.rollup({
    corr_sf: aq.op.corr("Seattle", "San Francisco"),
    corr_chi: aq.op.corr("Seattle", "Chicago")
  })
)
```

We can aggregate statistics per city. The following code reshapes (or “folds”) the data into two columns _city_ & _sun_ and shows the output as objects:

```js echo
dt.fold(aq.all(), {as: ["city", "sun"]})
  .groupby("city")
  .rollup({
    min: aq.op.min("sun"),
    max: aq.op.max("sun"),
    avg: (d) => aq.op.average(d.sun), // equivalent to aq.op.average("sun")
    med: (d) => aq.op.median(d.sun), // equivalent to aq.op.median("sun")
    skew: ({sun}) => (aq.op.mean(sun) - aq.op.median(sun)) / aq.op.stdev(sun)
  })
  .objects()
```

To load an Arquero table from an Apache Arrow, Apache Parquet, CSV, TSV, or JSON file, use [`file.arquero`](../files#arquero) <a href="https://github.com/observablehq/framework/pull/1509" class="observablehq-version-badge" data-version="prerelease" title="Added in #1509"></a>:

```js run=false
const flights = FileAttachment("flights-200k.arrow").arquero();
```

This is equivalent to:

```js run=false
const flights = aq.loadArrow(FileAttachment("flights-200k.arrow").href);
```

For more, see [Arquero’s official documentation](https://uwdata.github.io/arquero/).
