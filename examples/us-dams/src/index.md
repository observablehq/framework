# U.S. dams: national overview
##  Data from the U.S. National Inventory of Dams (NID)

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

<div class="card" style="margin: 0 -1rem; padding: 0">

<div style="padding: 1rem">

## Nationwide dam locations
### Zoom, scroll and rotate to explore dam densities in different regions

</div>

<div>

<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; background: var(theme-background-alt); height: 600px; margin: 0rem 0;"></div>
  <div style="position: absolute; top: 0rem; right: 0rem; filter: drop-shadow(0 0 4px rgba(0,0,0,.5));">${colorLegend}</div>
</figure>

</div>
</div>
<br>

# Dam conditions overview

<div class="card" style="max-width: none">
Of ${d3.format(",")(dams.length)} dams in the U.S. included in the <a href="https://nid.sec.usace.army.mil">National Inventory of Dams</a>, ${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor").length)} are listed as being in Poor condition. Of those in Poor condition, ${d3.format(",")(dams.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)} have High hazard potential, where "downstream flooding would likely result in loss of human life."
</div>

<div class="grid grid-cols-2" style="grid-auto-rows: 400px">
 <div class="card grid-colspan-1">
   <h2>Dam hazard potential and condition</h2>
   <h3>Nationwide counts</h3>
   ${resize((width, height) => conditionHazardGrid(width, height))}
 </div>
 <div class="card grid-colspan-1">
   ${resize((width, height) => conditionByAge(width, height))}
 </div>
</div>

```js
const colorRange = [
  [41, 63, 219],
  [136, 92, 255],
  [239, 0, 255],
  [255, 97, 80],
  [255, 149, 9],
  [255, 229, 51]
];

const colorLegend = Plot.plot({
  margin: 0,
  marginTop: 30,
  marginRight: 20,
  width: width / 4,
  height: 50,
  style: "color: 'currentColor';",
  x: {padding: 0, axis: null},
  marks: [
    Plot.cellX(colorRange, {fill: ([r, g, b]) => `rgb(${r},${g},${b})`, inset: 0.5}),
    Plot.text(["Fewer dams"], {frameAnchor: "top-left", dy: -12}),
    Plot.text(["More dams"], {frameAnchor: "top-right", dy: -12})
  ]
});
```

```js
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
      lineWidthMinPixels: 1,
      getLineColor: [60, 60, 60],
      getFillColor: [0, 0, 0]
    }),
    new HexagonLayer({
      id: "heatmap",
      data: dataMap,
      coverage: 0.5,
      radius: 7000,
      upperPercentile: 99,
      colorRange,
      elevationScale: 5000,
      elevationRange: [0, 50],
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
  height: height - 50,
  marginLeft: 100,
  marginBottom: 50,
  marginTop: 0,
  grid: true,
  x: {domain: conditions, label: "Condition assessment"},
  y: {domain: hazardPotential, label: "Hazard potential"},
  color: {
    domain: conditions,
    range: conditionsColors,
    label: "Condition assessment"
  },
  marks: [
    Plot.dot(dams, Plot.group({r: "count"}, {x: "conditionAssessment", y: "hazardPotential", fill: "conditionAssessment", tip: true}))
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
    height: height,
    x: {label: "Year construction finished", tickFormat: "Y", labelAnchor: "center", labelArrow: "none"},
    y: {label: "Number of dams", grid: true, ticks: 5, tickSize: 0},
    color: {
      domain: conditions,
      range: conditionsColors.reverse(),
      label: "Condition assessment"
    },
    marks: [
      Plot.rectY(dams, Plot.binX({y: "count"}, {x: "yearCompleted", fill: "conditionAssessment", order: conditions.reverse(), interval: 10, tip: true}))
    ]
  })
};
```