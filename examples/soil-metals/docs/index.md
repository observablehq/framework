# Soil metals

```js

const soilMetals = FileAttachment("data/soil-metals/soil-metals.csv").csv({typed: true});

const varLoadings = FileAttachment("data/soil-metals/var-loadings.csv").csv({typed: true});

const varExplained = FileAttachment("data/soil-metals/var-explained.csv").csv({typed: true});

const obsScores = FileAttachment("data/soil-metals/obs-scores.csv").csv({typed: true});
```

```js
display({soilMetals, varLoadings, varExplained, obsScores})
```

```js
const pickMetal = view(Inputs.radio(varLoadings.map(d => d.metal), {label: "Pick metal:", value: "aluminum"}))
const metal = Generators.input(pickMetal);
```


```js
Plot.plot({
  width: 500,
  marginLeft: 100,
  x: { grid: true },
  y: { grid: true, label: "District", tickSize: 0 },
  marks: [
    Plot.boxX(soilMetals, {
      x: pickMetal,
      y: "district",
      fill: "gray",
      opacity: 0.3,
      stroke: null
    }),
    Plot.dot(soilMetals, {
      x: pickMetal,
      y: "district",
      fill: "darkgray",
      opacity: 0.7
    }),
    Plot.tickX(
      soilMetals,
      Plot.groupY(
        { x: "median" },
        {
          x: pickMetal,
          y: "district",
          stroke: "black",
          strokeWidth: 2,
          sort: { y: "x", reverse: true }
        }
      )
    )
  ]
})
```

```js
const pickDistrict = Inputs.checkbox(
  soilMetals.map((d) => d.district),
  {
    label: "Highlight district(s):",
    unique: true,
    value: ["Algarrobal", "Carumas", "Chojata", "Coalaque"],
    sort: true
  }
);

const inputDistrict = Generators.input(pickDistrict);
```


```js
function biplot(width, height) {
return Plot.plot({
  width,
  x: {inset: 20, ticks: 5, axis: null},
  y: {inset: 20, ticks: 5, axis: null},
  marks: [
    Plot.dot(obsScores, {
      x: "PC1",
      y: "PC2",
      fill: "#BCBCBC",
      r: 2.5
    }),
    Plot.hull(obsScores, {
      x: "PC1",
      y: "PC2",
      fill: d => inputDistrict.includes(d.district) ? d.district : null,
      opacity: 0.1
    }),
    Plot.hull(obsScores, {
      x: "PC1",
      y: "PC2",
      stroke: d => inputDistrict.includes(d.district) ? d.district : null,
      strokeWidth: 2
    }),
    Plot.dot(obsScores, {
      x: "PC1",
      y: "PC2",
      filter: d => inputDistrict.includes(d.district),
      fill: "district",
      r: 3,
      opacity: 0.8
    }),
    Plot.arrow(varLoadings, { x1: 0, y1: 0, x2: "PC1_scale", y2: "PC2_scale" })
  ]
});
}
```

```js
function screeplot(width, height) {
return Plot.plot({
  width,
  height: height - 20,
  x: {label: null, ticks: 3},
  y: {label: "Variance explained (%)", 
      percent: true, 
      grid: true, 
      ticks: 6},
  marks: [
    Plot.barY(varExplained, {
      x: "pc",
      y: "variance",
      fill: "gray",
      sort: { x: "y", reverse: true }
    })
  ]
});
}
```

<div class="grid grid-cols-4" style="grid-auto-rows: 170px;">
  <div class="card grid-colspan-2 grid-rowspan-3">
    <h2>PCA biplot</h2>
    ${pickDistrict}
    ${resize((width, height) => biplot(width, height))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-3">
    <h2>Screeplot</h2>
    ${resize((width, height) => screeplot(width, height))}
  </div>
</div>

<div class="card" style="padding: 0">
  ${Inputs.table(varLoadings.map(({PC1_scale, PC2_scale, ...rest}) => rest))}
</div>
