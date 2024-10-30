## Wednesday Night Karaoke

{# This is rendered in the context of ../index.md.py, so it has some variables available #}

How do sales on Karaoke nights compare?

```js
const allSales = FileAttachment("/all_sales.json").json()
  .then(ds => ds.map(d => ({...d, order_date: new Date(d.order_date)})));
```

```js
const averageSalesPerDayByItem = (() => {
  let mapped = d3.rollup(
    allSales,
    byName => d3.mean(
      d3.rollups(
        byName,
        ds => ds.length,
        d => d.day_of_week,
      ),
      d => d[1],
    ),
    d => withoutPizzaSize(d.name),
  );
  return mapped;
})();
```

```js
const pizzaDifferences = (() => {
  const mondayCounts = d3.rollup(
    sales,
    ds => ds.length,
    d => withoutPizzaSize(d.name),
  );
  return Array.from(mondayCounts.entries())
    .map(([name, count]) => ({name, mondayCount: count}))
    .map(d => ({...d, weeklyAverage: averageSalesPerDayByItem.get(d.name)}))
    .map(d => ({...d, difference: d.mondayCount - d.weeklyAverage}));
})();
```

```js
const averageSalesPerDayBySize = (() => {
  let mapped = d3.rollup(
    allSales,
    byName => d3.mean(
      d3.rollups(
        byName,
        ds => ds.length,
        d => d.day_of_week,
      ),
      d => d[1],
    ),
    d => pizzaSize(d.name),
  );
  return mapped;
})();
```

```js
const sizeDifferences = (() => {
  const mondayCounts = d3.rollup(
    sales,
    ds => ds.length,
    d => pizzaSize(d.name),
  );
  return Array.from(mondayCounts.entries())
    .map(([size, count]) => ({size, mondayCount: count}))
    .map(d => ({...d, weeklyAverage: averageSalesPerDayBySize.get(d.size)}))
    .map(d => ({...d, difference: d.mondayCount - d.weeklyAverage}));
})();
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => Plot.plot({
      width,
      marginBottom: 80,
      x: {tickRotate: 30},
      y: {nice: true},
      color: {domain: ["above", "below"], range: ["#3ca951", "#ff725c"]},
      marks: [
        Plot.ruleY([0]),
        Plot.barY(pizzaDifferences, {
          x: "name",
          y: "difference",
          fill: d => d.difference > 0 ? "above" : "below",
          tip: true,
        })
      ]
    }))}
  </div>

  <div class="card">
    ${resize((width) => Plot.plot({
      width,
      marginBottom: 80,
      x: {tickRotate: 30},
      y: {nice: true},
      color: {domain: ["above", "below"], range: ["#3ca951", "#ff725c"]},
      marks: [
        Plot.ruleY([0]),
        Plot.barY(sizeDifferences, {
          x: "size",
          y: "difference",
          fill: d => d.difference > 0 ? "above" : "below",
          tip: true,
        })
      ]
    }))}
  </div>
</div>

```js
const formatDifference = d3.format("+.1f");
```
