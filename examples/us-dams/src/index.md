# U.S. dams: national overview

## Data from the U.S. National Inventory of Dams (NID)

```js
import deck from "npm:deck.gl";
```

```js
const dams = FileAttachment("data/dam-simple.csv").csv({typed: true});
```

```js
const {DeckGL, AmbientLight, GeoJsonLayer, TextLayer, HexagonLayer, LightingEffect, PointLight, ScatterplotLayer} = deck;
```

```js
// For deck.gl map
const dataArray = await FileAttachment("data/dam-simple.csv").csv({array: true, typed: true});

// just longitude/latitudes in arrays
const dataMap = dataArray.map(d => d.slice(3, 5).reverse()).slice(1);

const stateCentroidsRaw = await FileAttachment("data/us-state-centroids.json").json();

const stateCentroids = stateCentroidsRaw.features;

const usCounties = await FileAttachment("./data/us-counties-10m.json").json();

const states = topojson.feature(usCounties, usCounties.objects.states);
```

<div class="card" style="padding: 0px;">
<div style="padding: 1rem">
  <h2>U.S. dam locations and conditions</h2>
  <h3>Zoom, scroll and rotate to explore different regions</h3>
</div>
<div style="padding: 0px">
<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; height: 600px; margin: 0rem 0;">
  </div>
  <div style="position: absolute; top: 0rem; left: 1rem; filter: drop-shadow(0 0 4px rgba(0,0,0,.5));">${colorLegend}</div>
</figure>

</div>
</div>
<div class="card" style="max-width: none; font-size: 1.2rem">
<span style="color: var(--theme-foreground-muted)">Of ${d3.format(",")(dams.length)} U.S. dams included in the National Inventory of Dams,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor").length)}</span><span style="color: var(--theme-foreground-muted)"> are listed as being in Poor condition. Of those in Poor condition,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)}</span> <span style="color: var(--theme-foreground-muted)">have High hazard potential, where "downstream flooding would likely result in loss of human life."</span>
</div>

<div class="grid grid-cols-2 grid-rows-3" style="grid-auto-rows: 350px">
 <div class="card grid-colspan-1 grid-rowspan-1">
   <h2>Nationwide dam risk: hazard potential and condition</h2>
   <h3>Size indicates number of dams at each intersection</h3>
   ${resize((width, height) => conditionHazardGrid(width, height))}
 </div>
 <div class="card grid-colspan-1 grid-rowspan-2">
   <h2>State dam counts and conditions at-a-glance</h2>
   ${resize((width, height) => conditionsByState(width, height))}
 </div>
 <div class="card grid-colspan-1 grid-rowspan-1">
   <h2>Dam condition by year completed</h2>
   ${resize((width, height) => conditionByAge(width, height))}
 </div>
</div>
 <div class="card grid-colspan-2 grid-rowspan-1" style="padding: 0">
  <div style="padding: 1rem">
  ${searchUsDams}
  </div>
  ${Inputs.table(searchUsDamsValue, {columns: ["name", "state", "county", "primaryPurpose", "hazardPotential", "conditionAssessment"], header: {name: "Name", state: "State", county: "County", primaryPurpose: "Purpose", hazardPotential: "Hazard potential", conditionAssessment: "Condition assessment"}})}
  </div>

```js
// deck.gl setup
const colorRange = [
  [148,152,160], // not available
  [66,105,208], // satisfactory
  [151,187,245], // fair
  [239, 213, 24], // unsatisfactory
  [255, 114, 92] // poor
];

const colorLegend = Plot.plot({
  margin: 0,
  marginTop: 30,
  marginRight: 20,
  width: 400,
  height: 50,
  style: "color: 'currentColor';",
  x: {padding: 0, axis: null},
  marks: [
    Plot.cellX(colorRange, {fill: ([r, g, b]) => `rgb(${r},${g},${b})`, inset: 0.5}),
    Plot.text(["Not available"], {x: 0, dy: -20}),
    Plot.text(["Satisfactory"], {x: 1, dy: -20}),
    Plot.text(["Fair"], {x: 2, dy: -20}),
    Plot.text(["Unsatisfactory"], {x: 3, dy: -20}),
    Plot.text(["Poor"], {x: 4, dy: -20})
  ]
});

const effects = [
  new LightingEffect({
    ambientLight: new AmbientLight({color: [255, 255, 255], intensity: 1.0}),
    pointLight: new PointLight({color: [255, 255, 255], intensity: 0.5, position: [-0.144528, 49.739968, 80000]}),
    pointLight2: new PointLight({color: [255, 255, 255], intensity: 0, position: [-3.807751, 54.104682, 8000]})
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
  longitude: -93.6,
  latitude: 42,
  zoom: 5,
  minZoom: 1,
  maxZoom: 15,
  pitch: 45,
  bearing: 20
};
```

```js
deckInstance.setProps({
  layers: [
    new GeoJsonLayer({
      id: "base-map",
      data: states,
      lineWidthMinPixels: 1.5,
      getLineColor: [84, 84, 84],
      getFillColor: [38, 38, 38]
    }),
    ,
        new ScatterplotLayer({
          id: 'scatter-plot',
          data: dams,
          radiusScale: 0.0003,
          radiusMinPixels: 2,
          getRadius: d => d.maxStorageAcreFt,
          getPosition: d => [d.longitude, d.latitude, 0],
          getFillColor: d => d.conditionAssessment == "Not available" ? colorRange[0] : (d.conditionAssessment == "Satisfactory" ? colorRange[1] : (d.conditionAssessment == "Fair" ? colorRange[2] : (d.conditionAssessment == "Unsatisfactory" ? colorRange[3] : colorRange[4]))),
          opacity: 0.5
        }),
    new TextLayer({
        id: "text-layer",
        data: stateCentroids,
        pickable: true,
        getPosition: d => d.geometry.coordinates,
        getText: d => d.properties.name,
        fontFamily: 'Helvetica',
        fontWeight: 700,
        background: false,
        getSize: 14,
        getColor: [247,248,243, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        pickable: true,
        getPixelOffset: [0, -10]
      })
  ]
});
```

```js
// Nationwide dam conditions and hazard potential

const conditions = [
  "Not available",
  "Satisfactory",
  "Fair",
  "Unsatisfactory",
  "Poor"
];

const conditionsColors = [
  "#9498a0",
  "#4269d0",
  "#97bbf5",
  "#efb118",
  "#ff725c"
];

const hazardPotential = [
    "Undetermined",
    "Low",
    "Significant",
    "High"
].reverse()

function conditionHazardGrid(width, height) {
return  Plot.plot({
  width,
  height: height - 30,
  marginLeft: 100,
  marginBottom: 40,
  marginTop: 0,
  grid: true,
  x: {domain: conditions, label: "Condition assessment"},
  y: {domain: hazardPotential, label: "Hazard potential"},
  r: {range: [3, 25]},
  color: {
    domain: conditions,
    range: conditionsColors,
    label: "Condition assessment"
  },
  marks: [
    Plot.dot(dams, Plot.group({r: "count"}, {x: "conditionAssessment", y: "hazardPotential", fill: "conditionAssessment", tip: true, stroke: "currentColor", strokeWidth: 0.5}))
  ]
});
}
```

```js
// Dam condition by year completed
// TODO add interactivity here

function conditionByAge(width, height) {
    return Plot.plot({
        width,
        height: height - 50,
        marginBottom: 40,
        marginTop: 0,
        x: {label: "Year construction finished", tickFormat: "Y", labelAnchor: "center", labelArrow: "none"},
        y: {label: "Number of dams", grid: true, ticks: 5, tickSize: 0},
        color: {domain: conditions, range: conditionsColors, legend: true},
        marks: [
            Plot.rectY(dams, Plot.binX({y: "count"}, {x: "yearCompleted", fill: "conditionAssessment", order: conditions, interval: 10, tip: true}))
        ]
    })
};
```

```js
function conditionsByState(width, height) {

  return Plot.plot({
    width,
    height: height - 55,
    marginTop: -5,
    marginLeft: 100,
    marginBottom: 35,
    insetTop: -5,
    insetBottom: -5,
    color: {domain: conditions, range: conditionsColors, legend: true},
    y: {label: null},
    x: {label: "Number of dams", grid: true, ticks: 5, tickSize: 0},
    marks: [
      Plot.barX(dams, Plot.groupY({x: "count"}, {y: "state", sort: {y: "x", reverse: true}, fill: "conditionAssessment", order: conditions, tip: true, insetTop: 2}))
    ]
  });

}
```

```js
// For search with table
const searchUsDams = Inputs.search(dams);

const searchUsDamsValue = Generators.input(searchUsDams);
```
