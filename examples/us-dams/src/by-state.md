---
theme: wide
---

# Dam conditions by state

```js
const dams = FileAttachment("data/dam-simple.csv").csv({ typed: true });

const fips = FileAttachment("data/county_fips_master.csv").csv({ typed: true });

const capitals = FileAttachment("data/us-state-capitals.csv").csv({
  typed: true,
});

const usCounties = FileAttachment("./data/us-counties-10m.json").json();
```

```js
const fipsSelectedState = fips
  .filter((d) => d.state_name == pickState)
  .map((d) => d.fips);

const capitalSelectedState = capitals.filter((d) => d.name == pickState);

const states = topojson.feature(usCounties, usCounties.objects.states).features;

const counties = topojson
  .feature(usCounties, usCounties.objects.counties)
  .features.map((d) => ({ ...d, fips: +d.id }));
```

```js
const selectedState = states.filter((d) => d.properties.name === pickState);

const selectedStateCounties = counties.filter((d) =>
  fipsSelectedState.includes(d.fips)
);
```

```js
// Color palette for dam conditions
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
```

```js
const pickState = view(
  Inputs.select(
    dams
      .filter((d) => (d.state != "Guam") & (d.state != "Puerto Rico"))
      .map((d) => d.state),
    {
      multiple: false,
      label: "Pick a state:",
      unique: true,
      sort: true,
      value: "Oregon",
    }
  )
);
```

```js
// Get dams just for the selected state
const damsSelectedState = dams.filter((d) => d.state == pickState);
```

<div class="card" style="font-size: 1.2rem">
<span style="color: var(--theme-foreground-muted)">Of ${d3.format(",")(damsSelectedState.length)} ${pickState} dams listed in the NID,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(damsSelectedState.filter(d => d.conditionAssessment == "Poor").length)}</span><span style="color: var(--theme-foreground-muted)"> are listed as being in Poor condition. Of those in Poor condition,</span> <span style="color: var(--theme-foreground-alt)">${d3.format(",")(damsSelectedState.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)}</span> <span style="color: var(--theme-foreground-muted)">have High hazard potential, where "downstream flooding would likely result in loss of human life."
</div>

<div class="grid grid-cols-3 grid-rows-3" style="grid-auto-rows: 200px;">
<div class="card grid-colspan-2 grid-rowspan-3" style="padding: 0px">
<div style="padding: 1em">
<h3>Map dot size represents maximum storage capacity (acre-feet). The scale should only be used to compare dam sizes within ${pickState}, not across states.</h3>
${resize((width) => stackedBarChart(width))}
</div>
<div>
<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; height: 460px; margin: 0rem 0; padding: 0px">
  </div>
</figure>

</div>
</div>
<div class="card grid-rowspan-1">Blah</div>
<div class="card grid-colspan-1 grid-rowspan-2">
<h2>Dam counts by hazard potential and condition</h2>
${resize((width, height) => conditionHeatmap(width, height))}
</div>
</div>

<div class="grid grid-cols-2">
<div class="card grid-colspan-1 grid-rowspan-2">
${Inputs.table(damSearchValue, {columns: ["name", "yearCompleted", "hazardPotential", "conditionAssessment"], header: {name: "Name", yearCompleted: "Year completed", hazardPotential: "Hazard potential", conditionAssessment: "Condition"}})}
</div>
<div class="card grid-colspan-1 grid-rowspan-2">
${resize((width) => yearCompletedHistogram(width))}
</div>
</div>

${damSearch}

<!-- County FIPS codes from: https://github.com/kjhealy/fips-codes/blob/master/county_fips_master.csv -->

```js
// Map of dams in each state
function stateMap(width, height) {
  return Plot.plot({
    height: 450,
    width,
    marginBottom: 0,
    color: {domain: conditions, range: conditionsColors},
    projection: { type: "albers-usa", domain: selectedState[0].geometry },
    r: { range: [2, 15] },
    marks: [
      Plot.geo(selectedState, { fill: "#ccc", opacity: 0.3 }),
      Plot.geo(selectedStateCounties, {
        stroke: "white",
        strokeWidth: 1,
        opacity: 0.3,
      }),
      Plot.geo(selectedState, { stroke: "#ccc", strokeWidth: 1 }),
      Plot.dot(
        d3
          .sort(
            damsSelectedState,
            (d) => d.conditionAssessment == "Not available",
            (d) => d.maxStorageAcreFt
          )
          .reverse(),
        {
          x: "longitude",
          y: "latitude",
          r: "maxStorageAcreFt",
          opacity: 0.8,
          fill: "conditionAssessment",
          tip: true,
          title: (d) =>
            `Dam name: ${d.name}\nYear completed: ${d.yearCompleted}\nMax storage: ${d.maxStorageAcreFt} acre-ft\nPrimary purpose: ${d.primaryPurpose}\nCondition: ${d.conditionAssessment}`,
          sort: null,
        }
      ),
      Plot.dot(capitalSelectedState, {
        x: "longitude",
        y: "latitude",
        fill: "#ff2272",
        r: 6,
        stroke: "white",
        strokeWidth: 1,
        symbol: "star",
      }),
      Plot.text(capitalSelectedState, {
        x: "longitude",
        y: "latitude",
        text: "description",
        dy: -18,
        fontWeight: 600,
        fontSize: 14,
        fill: "currentColor"
      }),
    ],
  });
}
```

```js
const conditionCounts = d3
  .flatRollup(
    damsSelectedState,
    (d) => d.length,
    (v) => v.conditionAssessment
  )
  .map(([condition, count]) => ({ condition, count }));

// Stacked horizontal (1-D) bar chart of conditions
function stackedBarChart(width) {
  return Plot.plot({
    width,
    height: 50,
    //marginTop: 40,
    //marginBottom: 30,
    color: { domain: conditions, range: conditionsColors, legend: true },
    x: { label: "Number of dams" },
    marks: [
      Plot.barX(
        conditionCounts,
        Plot.stackX({
          x: "count",
          fill: "condition",
          order: conditions,
          tip: true,
          rx: 2,
          insetRight: 1
        })
      ),
      //Plot.textX(conditionCounts, Plot.stackX({x: "count", text: "condition", z: "condition", order: conditions, inset: 0.5, dy: -20, rotate: -30, textAnchor: "start"})),
    ],
  });
}
```

```js
// Bubble squares of hazard and conditiond
function conditionHeatmap(width, height) {
  return Plot.plot({
  width,
  height: height - 20,
  marginTop: 10,
  marginRight: 10,
  marginLeft: 100,
  marginBottom: 40,
  r: {range: [2, 25]},
  x: {domain: ["Undetermined", "Low", "Significant", "High"], label: "Hazard potential", grid: true},
  y: {domain: conditions, label: "Condition", grid: true, reverse: true},
  color: {domain: conditions, range: conditionsColors},
    marks: [
    Plot.dot(damsSelectedState, Plot.group({r: "count"},
      {x: "hazardPotential",
      y: "conditionAssessment",
      tip: true,
      fill: "conditionAssessment",
      stroke: "currentColor",
      strokeWidth: 0.5
    }))
  ]
  });
}
```

```js
// Search input (for searchable table)
const damSearch = Inputs.search(damsSelectedState);
```

```js
const damSearchValue = Generators.input(damSearch);
```

```js
// Year completed histogram
function yearCompletedHistogram(width) {
  return Plot.plot({
  width,
  height: 250,
  color: {legend: true, domain: conditions, range: conditionsColors},
  x: {tickFormat: "Y", label: "Year dam completed"},
  y: {grid: true},
  marks: [
    Plot.rectY(damsSelectedState, Plot.binX({y: "count"}, {x: "yearCompleted", fill: "conditionAssessment", interval: 10, order: conditions})),
    Plot.ruleY([0])
  ]
});
}
```

```js echo=false run=false
// Not currently included
function purposeHazardChart(width, height) {
  return Plot.plot({
    height: height - 50,
    width,
    marginLeft: 220,
    marginTop: 0,
    x: {grid: true},
    y: {label: null},
    color: {legend: true, domain: ["Low", "Significant", "High", "Undetermined"], range: ["#43AE8C", "#FFA840", "#E33C18", "#CFCFCF"]},
    marks: [
     Plot.barX(damsSelectedState, Plot.groupY({x: "count"}, {y: "primaryPurpose", fill: "hazardPotential", sort: {y: "x", reverse: true}}))
    ]
  });
}
```

```js
import deck from "npm:deck.gl";
```

```js
const {DeckGL, AmbientLight, GeoJsonLayer, TextLayer, HexagonLayer, LightingEffect, PointLight, ScatterplotLayer} = deck;
```

```js
const dataArray = await FileAttachment("data/dam-simple.csv").csv({array: true, typed: true});

// just longitude/latitudes in arrays
const dataMap = dataArray.map(d => d.slice(3, 5).reverse()).slice(1);

const stateCentroids = FileAttachment("data/states-centroids.csv").csv({typed: true});

// State bounding boxes from: https://gist.github.com/a8dx/2340f9527af64f8ef8439366de981168

const stateBoundingBox = FileAttachment("data/US_State_Bounding_Boxes.csv").csv({typed: true});
```

```js
// Get capital latitude & longitude
const pickStateLongitude = stateCentroids.filter(d => d.state == pickState)[0].longitude;

const pickStateLatitude = stateCentroids.filter(d => d.state == pickState)[0].latitude;
```

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
const deckInstance = new DeckGL({
  container,
  initialViewState,
  controller: true,
});

// clean up if this code re-runs
invalidation.then(() => {
  deckInstance.finalize();
  container.innerHTML = "";
});
```

```js
const initialViewState = {
  longitude: pickStateLongitude,
  latitude: pickStateLatitude,
  zoom: 5.3,
  minZoom: 1,
  maxZoom: 15,
  pitch: 0,
  bearing: 0
};
```

```js
deckInstance.setProps({
  layers: [
    new GeoJsonLayer({
      id: "base-map",
      data: selectedState,
      lineWidthMinPixels: 1.5,
      getLineColor: [84, 84, 84],
      getFillColor: [38, 38, 38]
    }),
    new GeoJsonLayer({
      id: "county-map",
      data: selectedStateCounties,
      lineWidthMinPixels: 1.5,
      getLineColor: [84, 84, 84],
      getFillColor: [38, 38, 38]
    }),
        new ScatterplotLayer({
          id: 'scatter-plot',
          data: damsSelectedState,
          radiusScale: 0.020,
          radiusMinPixels: 2,
          radiusMaxPixels: 20,
          getRadius: d => d.maxStorageAcreFt,
          getPosition: d => [d.longitude, d.latitude, 0],
          getFillColor: d => d.conditionAssessment == "Not available" ? colorRange[0] : (d.conditionAssessment == "Satisfactory" ? colorRange[1] : (d.conditionAssessment == "Fair" ? colorRange[2] : (d.conditionAssessment == "Unsatisfactory" ? colorRange[3] : colorRange[4]))),
          opacity: 1
        }),
        new ScatterplotLayer({
          id: 'scatter-plot',
          data: capitalSelectedState,
          radiusScale: 0.0010,
          radiusMinPixels: 8,
          getPosition: d => [d.longitude, d.latitude],
          getFillColor: [255, 255, 255, 255],
          getLineWidth: 20,
          opacity: 1
        }),
        new TextLayer({
        id: "text-layer",
        data: capitalSelectedState,
        pickable: true,
        getPosition: d => [d.longitude, d.latitude],
        getText: d => d.description,
        fontFamily: 'Helvetica',
        fontWeight: 700,
        background: true,
        getBackgroundColor: [0, 0, 0, 180],
        backgroundPadding: [2, 2, 2, 2],
        getSize: 16,
        getColor: [247,248,243, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        pickable: true,
        getPixelOffset: [0, -20]
      })
  ]
});
```
