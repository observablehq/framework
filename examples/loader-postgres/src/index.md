# Framework + PostgreSQL

This loads the data from PostgreSQL:

```js echo
const signups = FileAttachment("./data/signups.csv").csv({typed: true});
```

This displays the data in a table:

```js echo
Inputs.table(signups)
```

And this displays it in a chart:

```js echo
Plot.areaY(signups, {x: "date", y: "count"}).plot()
```
