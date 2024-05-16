# EXTRA UNUSED / UNFINISHED

```js
// US states
const us = FileAttachment("data/us-states.json").json();
const nation = us.then((us) => us.features.find(({id}) => id === "nation"));
const statemesh = us.then((us) => us.features.find(({id}) => id === "statemesh"));

// From: Jesse Howe at https://gist.github.com/JesseCHowe/bd746f638088b7fce50c09fa80898abd?short_path=950d9bc
const stateCentroidsRaw = await FileAttachment("data/us-state-centroids.json").json();

const stateCentroids = stateCentroidsRaw.features;

// State abbreviations
const stateAbb = FileAttachment("data/states.csv").csv({typed: true});

// County data
const usCounties = await FileAttachment("./data/us-counties-10m.json").json();

// Dams
const dams = FileAttachment("data/dam-simple.csv").csv({typed: true});

// Colors and conditions
const colors = ["#ccc", "#a41301", "#ff942f", "#ecd01d", "#91bf4b"];

const conditions = ["Not available", "Poor", "Unsatisfactory", "Satisfactory", "Fair"];
```

```js
const states = topojson.feature(usCounties, usCounties.objects.states);
```

```js
const showDensity = Inputs.toggle({label: "Show kernel density", value: true});

const densityToggle = Generators.input(showDensity);
```

```js
const abbMap = new Map(stateAbb.map(({State, Abbreviation}) => [State, Abbreviation]));

const dodgeStates = ["Rhode Island", "Maryland", "Delaware"];
```

```js
function damLocations(width) {
  return Plot.plot({
  width,
  caption: `Data: National Inventory of Dams. Each point represents a single dam.`,
  //r: {range: [1, 12]},
  projection: "albers-usa",
  //color: {scheme: "turbo"},
  marks: [
    Plot.geo(nation, {fill: "#ccc", fillOpacity: 0.5, stroke: "#ccc"}),
    Plot.dot(dams, {x: "longitude", y: "latitude", fill: "black", r: 1, opacity: 0.2}),
    //Plot.dot(dams, Plot.hexbin({r: "count", fill: "count"}, {x: "longitude", y: "latitude"})),
    Plot.density(dams, {x: "longitude", y: "latitude", bandwidth: 7, fill: "density", opacity: densityToggle == true ? 0.4 : 0}),
    Plot.geo(statemesh, {stroke: "white", opacity: 0.4}),
    Plot.geo(nation, {stroke: "#ccc"}),
    Plot.text(states, Plot.centroid({text: (d) => abbMap.get(d.properties.name), fontSize: 12, filter: d => !dodgeStates.includes(d.properties.name), fill: "black", stroke: "white"})),
    Plot.text(states, Plot.centroid({text: (d) => abbMap.get(d.properties.name), fontSize: 12, filter: d => dodgeStates.includes(d.properties.name), dx: 20, fill: "black", stroke: "white"}))
  ]
});
}
```

```js
const lastInspectionBox = Plot.plot({
  marginLeft: 100,
  marks: [
    Plot.dot(dams, {y: "state", x: "yearsSinceInspection", fill: "black", opacity: 0.3, r: 2}),
    Plot.boxX(dams, {y: "state", x: "yearsSinceInspection", stroke: null, opacity: 0.5}),
    Plot.tickX(
        dams,
        Plot.groupY(
          { x: "median" },
          {
            x: "yearsSinceInspection",
            y: "state",
            stroke: "red",
            strokeWidth: 4,
            sort: { y: "x", reverse: true },
            tip: true
          }
        )
      )
  ]
});
```

<!-- Make a Map connecting state name to number of dams in the state, then use get above to have the number of dams shown -->

```js
const conditionChart = Plot.plot({
  width,
  x: {domain: conditions, label: "Condition assessment"},
  color: {domain: conditions, range: colors},
  marks: [
    Plot.barY(dams, Plot.groupX({y: "count"}, {x: "conditionAssessment", fill: "conditionAssessment"}))
  ]
});
```

Of ${d3.format(",")(dams.length)} dams in the U.S. included in the [National Inventory of Dams](https://nid.sec.usace.army.mil), ${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor").length)} are listed as being in Poor condition. Of those in Poor condition, ${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)} have High hazard potential, where "downstream flooding would likely result in loss of human life."

<div class="grid grid-cols-3 grid-rows-4">
  <div class="grid-colspan-2 grid-rowspan-4 card">
  <h2>US dam locations</h2>
  <h3>Total dams reported as of 29 Apr 2024: ${d3.format(",")(dams.length)}</h3>
  ${showDensity}
  ${resize(width => damLocations(width))}</div>
  <div class="grid-colspan-1 card">Apples</div>
  <div class="grid-colspan-1 grid-rowspan-3 card">
  <h2>U.S. dam conditions</h2>
  ${resize((width, height) => donutFunction(nationalConditions, `Total: ${d3.format(",")(dams.length)}`, width, height))}</div>
</div>

```js
const pickTimeline = view(Inputs.radio(["New dams", "Cumulative dams"], {label: "Choose timeline:", value: "Cumulative dams"}));
```

<div class="grid card" style="height: 250px">
${resize((width, height) => newDamsChart(width, height))}
</div>

```js
display(lastInspectionBox);
```

```js
display(Inputs.table(dams.filter(d => d.daysSinceInspection < 0)))
```

```js
display(conditionChart);
```

```js
display(Inputs.table(dams));
```

```js
// Code adapted (barely) from Mike Bostock's Donut chart notebook (https://observablehq.com/@d3/donut-chart/2)

const donutFunction = function(data, centerText, width, containerheight) {
  const height = containerheight;
  const radius = Math.min(width, height) / 2;

  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius - 1);

  const pie = d3
    .pie()
    .padAngle(1 / radius)
    .sort(null)
    .value((d) => d.count);

  const color = d3
    .scaleOrdinal()
    .domain(["No data", "Poor", "Unsatisfactory", "Satisfactory", "Fair"])
    .range(["#ccc", "red", "orange", "yellow", "green"]
    );

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  svg
    .append("g")
    .selectAll()
    .data(pie(data))
    .join("path")
    .attr("fill", (d) => color(d.data.condition))
    .attr("d", arc)
    .append("title")
    .text((d) => `${d.data.condition}: ${d.data.count.toLocaleString()}`);

  svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .selectAll()
    .data(pie(data))
    .join("text")
    .attr("transform", (d) => `translate(${arc.centroid(d)})`)
    .call((text) =>
      text
        .append("tspan")
        .filter(d => d.endAngle - d.startAngle > 0.10)
        .attr("y", "-0.5em")
        .attr("font-weight", "bold")
        .text((d) => d.data.condition)
    )
    .call((text) =>
      text
        .filter((d) => d.endAngle - d.startAngle > 0.25)
        .append("tspan")
        .attr("x", 0)
        .attr("y", "0.7em")
        .attr("fill-opacity", 0.7)
        .text((d) => d.data.count.toLocaleString("en-US"))
    );

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", 14)
    .attr("font-weight", 700)
    .text(centerText);

  return svg.node();
};
```

```js
const nationalConditions = d3.flatRollup(dams, d => d.length, v => v.conditionAssessment).map(([condition, count]) => ({condition, count}));
//.sort(["No data", "Poor", "Unsatisfactory", "Satisfactory", "Fair"])
```

```js
display(nationalConditions);
```

```js
display(donutFunction(nationalConditions, "U.S. dam conditions", width));
```

```js
display(totalCumulativeDams);
```

```js
function newDamsChart(width, height) {
return pickTimeline == "New dams" ?
  Plot.plot({
    width,
    height: height - 45,
    title: "Dams completed in U.S.",
    marginBottom: 50,
    caption: `The ${d3.format(",")(damsUnknownYearCount)} dams with an unknown or unreported completion year are not represented in this chart.`,
    marginLeft: 50,
    y: {tickFormat: ",f", label: pickTimeline == "New dams" ? "New dams completed" : "Cumulative dams", grid: true},
    x: {tickFormat: "y", label: null},
    marks: [
       Plot.lineY(newDams, {x: "year", y: d => d.newDams, tip: true, curve: "step", fill: "#ccc", fillOpacity: 0.4, stroke: "#ccc"})]
   }) :
   Plot.plot({
    width,
    height: height - 45,
    marginBottom: 30,
    title: "Dams completed in U.S.",
    caption: `The baseline value of ${d3.format(",")(damsUnknownYearCount)} dams accounts for dams with an unknown or unreported completion year.`,
    y: {domain: [0, 93000], grid: true, label: "Total cumulative dams"},
    x: {tickFormat: "y", label: null},
    marginLeft: 50,
    marks: [
      Plot.areaY(totalCumulativeDams, {x: "year", y: "cumulativeDams", fill: "#ccc", opacity: 0.4}),
      Plot.lineY(totalCumulativeDams, {x: "year", y: "cumulativeDams", stroke: "#ccc", tip: true}),
      Plot.ruleY([d3.max(totalCumulativeDams, d => d.cumulativeDams)], {strokeDasharray: [4,4]}),
      Plot.ruleY([damsUnknownYearCount], {strokeDasharray: [4,4]})
    ]});
}
```

```js
const capacityDistribution = Plot.plot({
  color: {legend: true},
  y: {type: "sqrt", grid: true},
  marks: [
    Plot.rectY(dams, Plot.binX({y: "count"}, {x: d => Math.log10(d.maxStorageAcreFt || 1), inset: 0, fill: "conditionAssessment"}))
  ]
});
```

```js
display(capacityDistribution);
```

```js
const newDamsByYear = d3.flatRollup(dams, d => d.length, v => v.yearCompleted).map(([year, newDams]) => ({year, newDams})).filter(d => d.year != "NA");
```

```js
const damsUnknownYearCount = dams.filter(d => d.yearCompleted == "NA").length
```

```js
const newDams = d3.sort(newDamsByYear, d => d.year);
```

```js
const cumulativeDams = d3.cumsum(newDams.map(d => d.newDams));
```

```js
// This adds a baseline that is the number of dams w/ NA completion year (but that should still be included in the totals)

const totalCumulativeDams = newDams.map((d,i) => ({year: d.year, cumulativeDams: cumulativeDams[i] + damsUnknownYearCount}));
```

```js
display(totalCumulativeDams);
```

```js run=false echo=false
function purposeChart(width, height) {
  return Plot.plot({
    height: height,
    width,
    marginTop: 60,
    marginLeft: 220,
    y: {label: null},
    x: {grid: true},
    color: {domain: conditions, range: colors},
    marks: [
     Plot.barX(damsSelectedState, Plot.groupY({x: "count"}, {y: "primaryPurpose", fill: "conditionAssessment", sort: {y: "x", reverse: true}}))
    ]
  });
}
```

```js echo
import deck from "npm:deck.gl";
```

```js echo
const {DeckGL, AmbientLight, GeoJsonLayer, TextLayer, HexagonLayer, LightingEffect, PointLight, ScatterplotLayer} = deck;
```


<div class="card" style="margin: 0 -1rem;">

## U.S. dams
### A subtitle!

<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; background: var(theme-background-alt); height: 800px; margin: 1rem 0; "></div>
  <div style="position: absolute; top: 1rem; right: 1rem; filter: drop-shadow(0 0 4px rgba(0,0,0,.5));">${colorLegend}</div>
</figure>

</div>

```js
const colorRange = [
  [41, 63, 219],
  [136, 92, 255],
  [239, 0, 255],
  [255, 97, 80],
  [255, 149, 9]
];

const colorLegend = Plot.plot({
  margin: 0,
  marginTop: 20,
  width: width / 2,
  height: 35,
  style: "color: black;",
  x: {padding: 0, axis: null},
  marks: [
    Plot.cellX(colorRange, {fill: ([r, g, b]) => `rgb(${r},${g},${b})`, inset: 0.5}),
    Plot.text(["Fewer"], {frameAnchor: "top-left", dy: -12}),
    Plot.text(["More"], {frameAnchor: "top-right", dy: -12})
  ]
});
```

```js
const effects = [
  new LightingEffect({
    ambientLight: new AmbientLight({color: [255, 255, 255], intensity: 1.0}),
    pointLight: new PointLight({color: [255, 255, 255], intensity: 0.8, position: [-0.144528, 49.739968, 80000]}),
    pointLight2: new PointLight({color: [255, 255, 255], intensity: 0.8, position: [-3.807751, 54.104682, 8000]})
  })
];
```

```js
const deckInstance = new DeckGL({
  container,
  initialViewState,
  controller: true,
  effects
});

// clean up if this code re-runs
invalidation.then(() => {
  deckInstance.finalize();
  container.innerHTML = "";
});
```

```js
const initialViewState = {
  longitude: -98.4,
  latitude: 39.5,
  zoom: 4,
  minZoom: 1,
  maxZoom: 15,
  pitch: 0,
  bearing: -5
};
```

```js
const dataTest = FileAttachment("data/dam-simple.csv").csv({array: true, typed: true});
```

```js
// just longitude/latitudes in arrays
const data = dataTest.map(d => d.slice(3, 5).reverse()).slice(1);
```

```js
deckInstance.setProps({
  layers: [
    new GeoJsonLayer({
      id: "base-map",
      data: states,
      lineWidthMinPixels: 1,
      getLineColor: [60, 60, 60],
      getFillColor: [0, 0, 0]
    }),
    new HexagonLayer({
      id: "heatmap",
      data,
      coverage: 0.8,
      radius: 5000,
      upperPercentile: 99,
      colorRange,
      elevationScale: 5000,
      elevationRange: [0, 300],
      extruded: true,
      getPosition: (d) => d,
      pickable: true,
      material: {
        ambient: 0.64,
        diffuse: 0.6,
        shininess: 32,
        specularColor: [51, 51, 51]
      }
    }),
    new TextLayer({
        id: "text-layer",
        data: stateCentroids,
        pickable: true,
        getPosition: d => d.geometry.coordinates,
        getText: d => d.properties.name,
        getSize: 12,
        getColor: [247,248,243],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        pickable: true,
        getPixelOffset: [20, -30]
      })
  ]
});
```

<!-- cruuuuft

    -- new TextLayer({
    --     id: "text-layer",
    --     data: stateCentroids,
    --     pickable: true,
    --     getPosition: d => d.geometry.coordinates,
    --     getText: d => d.properties.name,
    --     getSize: 16,
    --     getColor: [247,248,243],
    --     getTextAnchor: 'middle',
    --     getAlignmentBaseline: 'center'
    --   })

    [0, 102, 204]


    new ScatterplotLayer({
          id: 'scatter-plot',
          data: dams,
          radiusScale: 0.0003,
          radiusMinPixels: 2,
          getRadius: d => d.maxStorageAcreFt,
          getPosition: d => [d.longitude, d.latitude, 0],
          getFillColor: d => d.conditionAssessment == "Not available" ? colorRange[0] : (d.conditionAssessment == "Poor" ? colorRange[1] : (d.conditionAssessment == "Unsatisfactory" ? colorRange[2] : (d.conditionAssessment == "Fair" ? colorRange[3] : colorRange[4]))),
          opacity: 0.1
        }),
-->

```js
display(dams);

display(colorRange[1]);

display(new Set(dams.map(d => d.conditionAssessment)));
```

