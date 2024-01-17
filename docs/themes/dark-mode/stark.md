---
theme: [stark]
---

```js
// stdlib dataset
const industriesSubset = industries.filter(d => ["Transportation and Utilities", "Mining and Extraction", "Finance", "Agriculture", "Information"].includes(d.industry));

const barData = [
  {"Category":"Alpha","Value":9.8},{"Category":"Beta","Value":7.8},{"Category":"Gamma","Value":6.3},{"Category":"Delta","Value":5},{"Category":"Epsilon","Value":4},{"Category":"Zeta","Value":3.2}
];
```

# Stark
This is a preview of how this [theme](./config#theme) will look when used on a project page.

<div class="grid grid-cols-2">
  <div class="card">
    ${
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle text goes here',
        marks: [
          Plot.line(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", strokeWidth: 1, tip: true})
        ],
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        x: {label: "X", ticks: 5},
        height: 200,
        width: 400
      })
    }
  </div>
  <div class="card">
    ${
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle text goes here',
        marks: [
          Plot.barX(barData, { x: "Value", y: "Category", fill: "Category" } )
        ],
        height: 200, width: 400,
        x: { domain: [0, 10] },
      })
    }
  </div>
</div>