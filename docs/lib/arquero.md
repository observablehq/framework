# Arquero

Arquero is a JavaScript library for query processing and transformation of array-backed data tables.

Arquero (version <strong>${aq.version ?? "nope"}</strong>) is available by default as the **aq** symbol from Observable’s stdlib:

```js echo
aq
```

Following the documentation website’s [introduction](https://uwdata.github.io/arquero/), let’s extract some methods:

```js echo
const { all, desc, op, table } = aq;
```

We can then create a table of the Average hours of sunshine per month, from [usclimatedata.com](https://usclimatedata.com/).

```js echo
const dt = table({
  'Seattle': [69, 108, 178, 207, 253, 268, 312, 281, 221, 142, 72, 52],
  'Chicago': [135, 136, 187, 215, 281, 311, 318, 283, 226, 193, 113, 106],
  'San Francisco': [165, 182, 251, 281, 314, 330, 300, 272, 267, 243, 189, 156]
});
```

As we see, arquero is column-oriented: each column is an array of values of a given type (here, numbers representing hours of sunshine per month).

But a table is also iterable and as such, its contents can be displayed with [Inputs.table](/lib/inputs#table).

```js echo
Inputs.table(dt, {width: 370})
```

An arquero table can be used as a data source to make happy charts with [Observable Plot](/lib/plot):

```js echo
Plot.plot({
  height: 150,
  x: {label: "month"},
  y: {zero: true, grid: true, label: "hours of ☀️"},
  marks: [
    Plot.lineY(dt, {y: "Seattle", marker: true, stroke: "red"}),
    Plot.lineY(dt, {y: "Chicago", marker: true, stroke: "turquoise"}),
    Plot.lineY(dt, {y: "San Francisco", marker: true, stroke: "orange"})
  ]
})
```

Arquero supports a range of data transformation tasks, including filter, sample, aggregation, window, join, and reshaping operations. For example, the following operation derives differences between Seattle and Chicago and sorts the months accordingly.

```js
Inputs.table(diffs, {width: 250})
```

```js echo
const diffs = dt.derive({
    month: d => op.row_number(),
    diff:  d => d.Seattle - d.Chicago
  })
  .select('month', 'diff')
  .orderby(desc('diff'));
```

Is Seattle more correlated with San Francisco or Chicago?

```js
Inputs.table(correlations, {width: 250})
```

```js echo
const correlations = dt.rollup({
  corr_sf:  op.corr('Seattle', 'San Francisco'),
  corr_chi: op.corr('Seattle', 'Chicago')
})
```

We can aggregate statistics per city: the following reshapes (folds) the data to a two column layout: city, sun, and shows the output as objects:

```js echo
dt.fold(all(), { as: ['city', 'sun'] })
  .groupby('city')
  .rollup({
    min:  d => op.min(d.sun), // functional form of op.min('sun')
    max:  d => op.max(d.sun),
    avg:  d => op.average(d.sun),
    med:  d => op.median(d.sun),
    // functional forms permit flexible table expressions
    skew: ({sun: s}) => (op.mean(s) - op.median(s)) / op.stdev(s) || 0
  })
  .objects()
```

For more, see [arquero’s official documentation](https://uwdata.github.io/arquero/).
