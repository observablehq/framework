---
theme: midnight
toc: false
---

<style>
#observablehq-sidebar-toggle {display: none;}
</style>


```js
const subset = new Set(["Transportation and Utilities", "Mining and Extraction", "Finance", "Agriculture", "Information"]);
const industriesSubset = industries.filter(d => subset.has(d.industry));
const barData = [
  {Category: "Alpha", Value: 9.8},
  {Category: "Beta", Value: 7.8},
  {Category: "Gamma", Value: 6.3},
  {Category: "Delta", Value: 5},
  {Category: "Epsilon", Value: 4},
  {Category: "Zeta", Value: 3.2},
];
```

# midnight

This is a preview of the midnight [theme](./config#theme).

<div class="grid grid-cols-2">
  <div class="card">
    ${
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle goes here',
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        x: {label: "X", ticks: 5},
        height: 200,
        width: 400,
        marks: [
          Plot.line(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", strokeWidth: 1, tip: true})
        ]
      })
    }
  </div>
  <div class="card">
    ${
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle',
        marginLeft: 75,
        height: 200,
        width: 400,
        x: {domain: [0, 10]},
        marks: [
          Plot.barX(barData, {x: "Value", y: "Category", fill: "Category"} )
        ]
      })
    }
  </div>
</div>