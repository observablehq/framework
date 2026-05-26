# Soil metal analysis
## In mining regions across Moquegua, Peru

```js

const soilMetals = FileAttachment("data/soil-metals/soil-metals.csv").csv({typed: true});

const varLoadings = FileAttachment("data/soil-metals/var-loadings.csv").csv({typed: true});

const varExplained = FileAttachment("data/soil-metals/var-explained.csv").csv({typed: true});

const obsScores = FileAttachment("data/soil-metals/obs-scores.csv").csv({typed: true});
```

```js
const pickMetal = Inputs.radio(varLoadings.map(d => d.metal), {label: "Pick metal:", value: "aluminum"});
const metal = Generators.input(pickMetal);
```


```js
function boxPlot(width, height) {
return Plot.plot({
  width, 
  height: height - 100,
  marginLeft: 100,
  x: { grid: true, label: "Soil concentration (mg/kg)"},
  y: { grid: true, label: "District", tickSize: 0 },
  marks: [
    Plot.boxX(soilMetals, {
      x: metal,
      y: "district",
      fill: "gray",
      opacity: 0.3,
      stroke: null
    }),
    Plot.dot(soilMetals, {
      x: metal,
      y: "district",
      fill: "darkgray",
      opacity: 0.7
    }),
    Plot.tickX(
      soilMetals,
      Plot.groupY(
        { x: "median" },
        {
          x: metal,
          y: "district",
          stroke: "#ff725c",
          strokeWidth: 4,
          sort: { y: "x", reverse: true }
        }
      )
    )
  ]
});
}
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
  height: height - 120,
  x: {label: `PC1 (${d3.format(".1%")(varExplained.map(d => d.variance)[0])})`, ticks: 6},
  y: {label: `PC1 (${d3.format(".1%")(varExplained.map(d => d.variance)[1])})`, ticks: 6},
  marks: [
    Plot.frame({stroke: "#BCBCBC"}),
    Plot.dot(obsScores, {
      x: "PC1",
      y: "PC2",
      fill: "#BCBCBC",
      opacity: 0.5,
      r: 2.5
    }),
    Plot.hull(obsScores, {
      x: "PC1",
      y: "PC2",
      fill: d => inputDistrict.includes(d.district) ? d.district : null,
      opacity: 0.4
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
    Plot.arrow(varLoadings, { x1: 0, y1: 0, x2: "PC1_scale", y2: "PC2_scale" }),
    Plot.text(varLoadings, {
      text: "metal",
      x: "PC1_scale",
      y: "PC2_scale",
      dy: -5,
      dx: 30,
      fill: "black",
      stroke: "white",
      fontSize: 11
    })
  ]
});
}
```

```js
function screeplot(width, height) {
return Plot.plot({
  marginTop: 15,
  width,
  height,
  x: {label: null},
  y: {axis: null},
  marks: [
    Plot.barY(varExplained, {
      x: "pc",
      y: "variance",
      fill: "gray",
      sort: { x: "y", reverse: true }
    }),
    Plot.ruleY([0]),
    Plot.text(varExplained, {
      text: (d) => d3.format(".1%")(d.variance),
      x: "pc",
      y: "variance",
      dy: -8
    })
  ]
});
}
```

<div class="grid grid-cols-4" style="grid-auto-rows: 145px;">
  <div class="card grid-colspan-2 grid-rowspan-4">
    <h2>Principal component analysis</h2>
    <h3>Axis scales are for observation scores. See table for loading values.</h3>
    ${pickDistrict}
    ${resize((width, height) => biplot(width, height))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-2">
    <h2>Variance explained</h2>
    ${resize((width, height) => screeplot(width, height))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-2" style="padding: 0; border-radius: 12px; overflow: hidden;">
    ${Inputs.table(varLoadings.map(({PC1_scale, PC2_scale, ...rest}) => rest), {height: 320})}
  </div>
</div>

<div class="grid grid-cols-4" style="grid-auto-rows: 160px;">
  <div class="card grid-colspan-4 grid-rowspan-3">
    <h2>Soil metal concentration by district</h2>
    <h3>Dots are individual soil sample values; black line is the median for each district. Box is the interquartile range. All values in mg/kg.</h3>
    ${pickMetal}
    ${resize((width, height) => boxPlot(width, height))}
  </div>
</div>

  <div class="note" label="Data">Bedoya-Perales, N.S., Escobedo-Pacheco, E., Maus, D. et al. Dataset of metals and metalloids in food crops and soils sampled across the mining region of Moquegua in Peru. Sci Data 10, 483 (2023). <a href="https://doi.org/10.1038/s41597-023-02363-0">https://doi.org/10.1038/s41597-023-02363-0</a></div>
