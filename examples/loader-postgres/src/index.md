# Framework + PostgreSQL

This loads the data from PostgreSQL:

```js echo
const edits = FileAttachment("./data/edits.csv").csv({typed: true});
```

This displays the data in a table:

```js echo
Inputs.table(edits)
```

And this displays it in a chart:

```js echo
Plot.plot({
  marks: [
    Plot.areaY(edits, {x: "date", y: "count", curve: "step"}),
    Plot.ruleY([0])
  ]
})
```
