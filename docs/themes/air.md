---
theme: air
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

# Theme: air

This is a preview of the `air` [theme](../config#theme).

<div class="grid grid-cols-2">
  <div class="card">
    ${resize((width) =>
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle goes here',
        x: {label: "X", ticks: 5},
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        style: "width: 100%;",
        height: 200,
        width,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", tip: true})
        ]
      }))
    }
  </div>
  <div class="card">
    ${resize((width) =>
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle',
        marginLeft: 75,
        style: "width: 100%;",
        height: 200,
        width,
        x: {domain: [0, 10]},
        marks: [
          Plot.rectX(barData, {x: "Value", y: "Category", fill: "Category"}),
          Plot.ruleX([0])
        ]
      }))
    }
  </div>
</div>