# U.S. dams: national overview

## Data from the [National Inventory of Dams](https://nid.sec.usace.army.mil/#/)

```js
// Import deck.gl components for interactive map
import deck from "npm:deck.gl";

const {DeckGL, AmbientLight, GeoJsonLayer, TextLayer, HexagonLayer, LightingEffect, PointLight, ScatterplotLayer} = deck;
```

```js
// County-level data for US
const us = await fetch(import.meta.resolve("npm:us-atlas/counties-10m.json")).then((r) => r.json());

// State polygons
const states = topojson.feature(us, us.objects.states);

// Find state centroids (for text label)
const stateCentroid = states.features.map(d => ({name: d.properties.name, longitude: d3.geoCentroid(d.geometry)[0], latitude: d3.geoCentroid(d.geometry)[1]}));

// NID dams data:
const dams = FileAttachment("data/dam-simple.csv").csv({typed: true});
```

<div class="grid grid-cols-3">
<div class="card grid-colspan-2" style="padding: 0px;">
<div style="padding: 1rem;">
  <h2>U.S. dam locations</h2>
  <h3>Zoom and scroll, or hold down Shift to rotate.
  ${colorLegend}
</div>
<div>
<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; height: 620px; margin: 0rem 0;">
  </div>
</figure>
</div>
</div>
  <div class="card grid-colspan-1">
    <h2>Dam counts by state or territory</h2>
    <h3>Total dams listed in NID: ${d3.format(",")(dams.length)}</h3>
    ${resize((width, height) => countsByState(width, height))}
  </div>
</div>

<!-- Text box with poor condition, high risk summary -->
<div class="card" style="max-width: none; font-size: 1.2rem">
<span style="color: var(--theme-foreground-muted)">Of ${d3.format(",")(dams.length)} U.S. dams included in the National Inventory of Dams,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor").length)}</span><span style="color: var(--theme-foreground-muted)"> are listed as being in Poor condition. Of those in Poor condition,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)}</span> <span style="color: var(--theme-foreground-muted)">have High hazard potential, where “downstream flooding would likely result in loss of human life.”</span>
</div>

<!-- Risk bubble chart and year completed histogram -->
<div class="grid grid-cols-2 grid-rows-3" style="grid-auto-rows: 350px">
 <div class="card grid-colspan-1 grid-rowspan-1">
   <h2>Nationwide dam risk: hazard potential and condition</h2>
   <h3>Size indicates number of dams at each intersection</h3>
   ${resize((width, height) => conditionHazardGrid(width, height))}
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
  ${Inputs.table(searchUsDamsValue, {columns: ["name", "state", "county", "primaryPurpose", "hazardPotential", "conditionAssessment"], header: {name: "Name", state: "State", county: "County", primaryPurpose: "Purpose", hazardPotential: "Hazard potential", conditionAssessment: "Condition"}})}
  </div>

<!-- Create interactive map with deck.gl -->

```js
const colorRange = [
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37]
];

const colorLegend = Plot.plot({
  margin: 0,
  marginTop: 30,
  marginRight: 20,
  width: 450,
  height: 50,
  style: "color: 'currentColor';",
  x: {padding: 0, axis: null},
  marks: [
    Plot.cellX(colorRange, {fill: ([r, g, b]) => `rgb(${r},${g},${b})`, inset: 2}),
    Plot.text(["Fewer dams"], {frameAnchor: "top-left", dy: -12}),
    Plot.text(["More dams"], {frameAnchor: "top-right", dy: -12})
  ]
});

const effects = [
  new LightingEffect({
    ambientLight: new AmbientLight({color: [255, 255, 255], intensity: 1}),
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
  longitude: -100,
  latitude: 36,
  zoom: 4.1,
  minZoom: 3,
  maxZoom: 7,
  pitch: 45,
  bearing: 20
};
```

```js
deckInstance.setProps({
  controller: true,
  layers: [
    new GeoJsonLayer({
      id: "base-map",
      data: states,
      lineWidthMinPixels: 1.5,
      getLineColor: [255,255,255, 100],
      getFillColor: [38, 38, 38]
    }),
    new HexagonLayer({
      id: 'hexbin-plot',
      data: dams,
      coverage: 0.2,
      radius: 6000,
      upperPercentile: 99,
      colorRange,
      elevationScale: 100,
      elevationRange: [50, 15000],
      extruded: true,
      getPosition: d => [d.longitude, d.latitude],
      opacity: 1,
      material: {
        ambient: 1,
        specularColor: [51, 51, 51]
      }
    }),
    new TextLayer({
        id: "text-layer",
        data: stateCentroid,
        getPosition: d => [d.longitude, d.latitude],
        getText: d => d.name,
        fontFamily: 'Helvetica',
        fontWeight: 700,
        background: false,
        fontSettings: ({
          sdf: true,
          }),
        outlineWidth: 4,
        getSize: 14,
        getColor: [247,248,243, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        getPixelOffset: [0, -10]
      })
  ]
});
```

<!-- Create bubble chart of dam risk counts -->

```js
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
  x: {domain: conditions, label: "Condition"},
  y: {domain: hazardPotential, label: "Hazard potential"},
  r: {range: [3, 25], label: "Number of dams"},
  color: {
    domain: conditions,
    range: conditionsColors,
    label: "Condition"
  },
  marks: [
    Plot.dot(dams, Plot.group({r: "count"}, {x: "conditionAssessment", y: "hazardPotential", fill: "conditionAssessment", tip: true, stroke: "currentColor", strokeWidth: 0.5}))
  ]
});
}
```

<!-- Create histogram by year completed -->

```js
function conditionByAge(width, height) {
  return Plot.plot({
    width,
    height: height - 50,
    marginBottom: 40,
    marginTop: 0,
    x: {label: "Year construction finished", tickFormat: "Y", labelAnchor: "center", labelArrow: "none"},
    y: {label: "Number of dams", grid: true, ticks: 5, tickSize: 0},
    color: {domain: conditions, range: conditionsColors, legend: true, label: "Condition"},
    marks: [
      Plot.rectY(dams, Plot.binX({y: "count"},
        {x: "yearCompleted",
        fill: "conditionAssessment",
         order: conditions,
         interval: 10,
         tip: true
         })
       )
     ]
   })
};
```

<!-- Lollipop chart of dams by state / territory -->

```js
function countsByState(width, height) {

  return Plot.plot({
    width,
    height: height - 40,
    marginTop: 10,
    marginLeft: 100,
    marginBottom: 35,
    insetTop: -5,
    insetBottom: -5,
    color: {scheme: "Viridis"},
    y: {label: "State"},
    x: {label: "Number of dams", grid: true, ticks: 5, tickSize: 0},
    marks: [
      Plot.ruleY(dams, Plot.groupY({x: "count"}, {y: "state", strokeWidth: 0.5, sort: {y: "x", reverse: true}})),
      Plot.dot(dams, Plot.groupY({x: "count", fill: "count"}, {y: "state", r: 4, stroke: "currentColor", strokeWidth: 0.5, tip: true, sort: {y: "x", reverse: true}, title: d => `${d.state}`}))
    ]
  });

}
```

<!-- Searchable table -->

```js
// For search with table
const searchUsDams = Inputs.search(dams);

const searchUsDamsValue = Generators.input(searchUsDams);
```
