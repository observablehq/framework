---
theme: dashboard
title: Example dashboard
toc: false
---

# Rocket launches 🚀

<!-- load and transform the data -->

```js
const launchHistory = await FileAttachment("data/launchHistory.csv")
  .csv({typed: true});

const format = d3.format(",");
function launches(id) {
  return format(launchHistory.filter((d) => d.stateId === id).length);
}
```

<!-- cards with big numbers -->

<div class="grid grid-cols-4">
  <div class="card">
    <h2>United States</h2>
    <span class="big">${launches("US")}</span>
  </div>
  <div class="card">
    <h2>Soviet Union</h2>
    <span class="big">${launches("SU")}</span>
  </div>
  <div class="card">
    <h2>Russia</h2>
    <span class="big">${launches("RU")}</span>
  </div>
  <div class="card">
    <h2>China</h2>
    <span class="big">${launches("CN")}</span>
  </div>
</div>

<!-- plot of launch history -->

<div class="card grid grid-cols-8">
  ${resize((width) => Plot.plot({
    width,
    title: "Launches over the years",
    height: 300,
    x: {label: null, interval: "year"},
    y: {grid: true, label: "Launches"},
    color: {legend: true, label: "State"},
    marks: [
      Plot.barY(
        launchHistory,
        Plot.groupX(
          {y: "count"},
          {x: d => new Date(d.date), fill: "state", tip: {format: {x: false}}}
        )
      ),
      Plot.ruleY([0])
    ]
  }))}
</div>

<!-- plot of launch vehicles -->

<div class="card grid grid-cols-8">
  ${resize((width) => Plot.plot({
    width,
    title: "Popular Launch Vehicles",
    marginLeft: 65,
    height: 300,
    x: { grid: true, label: "Launches" },
    y: { label: "Vehicle Family" },
    color: { legend: true, label: "State" },
    marks: [
      Plot.barX(
        launchHistory,
        Plot.groupY(
          { x: "count" },
          { y: "family",  fill: "state", tip: true, sort: { y: "x", reverse: true }}
        )
      ),
      Plot.ruleX([0])
    ]
  }))}
</div>

Data: Jonathan C. McDowell, [General Catalog of Artificial Space Objects](https://planet4589.org/space/gcat)
