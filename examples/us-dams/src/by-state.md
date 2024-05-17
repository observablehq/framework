---
theme: ["cotton", "near-midnight"]
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
const colors = ["#9498a0", "#ff725c", "#efb118", "#97bbf5", "#4269d0"];

const conditions = [
  "Not available",
  "Poor",
  "Unsatisfactory",
  "Fair",
  "Satisfactory",
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
      value: "Massachusetts",
    }
  )
);
```

```js
// Get dams just for the selected state
const damsSelectedState = dams.filter((d) => d.state == pickState);
```

<div class="grid grid-cols-3 grid-rows-3" style="grid-auto-rows: 200px">
<div class="card grid-colspan-2 grid-rowspan-3">
<h2>${pickState} dams</h2>
<h3>Map dot size represents maximum storage capacity (acre-feet). The scale should only be used to compare dam sizes within ${pickState}, not across states.</h3>
${resize((width) => stackedBarChart(width))}
${resize((width, height) => stateMap(width, height))}</div>
<div class="card grid-rowspan-1" style="font-size: 1.2em">
Of ${d3.format(",")(damsSelectedState.length)} NID recorded dams in ${pickState}, <b>${d3.format(",")(damsSelectedState.filter(d => d.conditionAssessment == "Poor").length)} ${damsSelectedState.filter(d => d.conditionAssessment == "Poor").length == 1 ? "is" : "are"} in poor condition</b>. Of those in poor condition, <b>${d3.format(",")(damsSelectedState.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length)} ${damsSelectedState.filter(d => d.conditionAssessment == "Poor" && d.hazardPotential == "High").length == 1 ? "has" : "have"} high hazard potential</b>, where "downstream flooding would likely result in loss of human life." 
</div>
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
    color: {domain: conditions, range: colors},
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
    color: { domain: conditions, range: colors, legend: true },
    x: { label: "Number of dams" },
    marks: [
      Plot.barX(
        conditionCounts,
        Plot.stackX({
          x: "count",
          fill: "condition",
          order: conditions,
          tip: true,
          rx: 5
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
  r: {range: [1, 20]},
  x: {domain: ["Undetermined", "Low", "Significant", "High"], label: "Hazard potential", grid: true},
  y: {domain: ["Satisfactory", "Fair", "Unsatisfactory", "Poor", "Not available"], label: "Condition", grid: true, reverse: true},
  color: {domain: ["Low", "Significant", "High"],
  range: ["yellow", "orange", "red"]},
    marks: [
    Plot.dot(damsSelectedState, Plot.group({r: "count"},
      {x: "hazardPotential",
      y: "conditionAssessment",
      symbol: "square",
      tip: true,
      fill: "currentColor",
      opacity: 0.7
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
  color: {legend: true, domain: conditions, range: colors},
  x: {tickFormat: "Y", label: "Year dam completed"},
  y: {grid: true},
  marks: [
    Plot.rectY(damsSelectedState, Plot.binX({y: "count"}, {x: "yearCompleted", fill: "conditionAssessment", interval: 10, order: ["Not available", "Poor", "Unsatisfactory", "Fair", "Satisfactory"]})),
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

<!-- Fiddling with beeswarm below this point -->

```js
// Toggle input for beeswarm chart
const toggleBeeswarm = Inputs.radio(["primary purpose", "hazard potential"], {
  label: "Color by dam: ",
  value: "primary purpose",
});

const toggleBeeswarmValue = Generators.input(toggleBeeswarm);
```

```js
const lastInspectionBeeswarm = Plot.plot({
  width,
  height: 300,
  //style: { overflow: "visible" },
  color: { legend: true },
  subtitle: ``,
  caption: `Years since last inspection for individual dams in ${pickState}. Each dot represents a single dam; size is representative of maximum storage capacity. Dams toward the right on the chart have been inspected more recently.`,
  r: { range: [1.5, 15] },
  x: { tickFormat: "0f", reverse: true, label: "Years since last inspection" },
  marks: [
    Plot.frame({ insetPadding: 5 }),
    Plot.dot(
      damsSelectedState,
      Plot.dodgeY({
        x: (d) => +d.yearsSinceInspection,
        r: "maxStorageAcreFt",
        fill:
          toggleBeeswarmValue == "primary purpose"
            ? "primaryPurpose"
            : "hazardPotential",
        tip: true,
        stroke: "white",
        strokeWidth: 0.5,
      })
    ),
  ],
});
```

<div class="card">
<h2>Years since last inspection</h2>
<h3>${d3.format(",")(damsSelectedState.filter(d => d.yearsSinceInspection != "NA").length)} out of ${d3.format(",")(damsSelectedState.length)} dams in ${pickState} (${d3.format(".3s")(100 * damsSelectedState.filter(d => d.yearsSinceInspection != "NA").length / damsSelectedState.length)}%) are represented in this chart; those missing an inspection date are not shown. Based on the dams with a reported last inspection date, at least ${d3.format(".1f")(100 * damsSelectedState.filter(d => d.yearsSinceInspection <=10).length / damsSelectedState.length)}% of all ${pickState} dams have been inspected within past 10 years, and at least ${d3.format(".1f")(100 * damsSelectedState.filter(d => d.yearsSinceInspection <=10 && d.hazardPotential == "High").length / damsSelectedState.filter(d => d.hazardPotential == "High").length)}% of all ${pickState} dams considered to have High hazard potential have been inspected within past 10 years.</h3>
${toggleBeeswarm}
${display(lastInspectionBeeswarm)}
</div>

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

const stateCentroidsRaw = await FileAttachment("data/us-state-centroids.json").json();

const stateCentroids = stateCentroidsRaw.features;
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
  ]
});
```

<div style="padding: 0px">
<figure style="max-width: none; position: relative;">
  <div id="container" style="border-radius: 8px; overflow: hidden; height: 600px; margin: 0rem 0;">
  </div>
</figure>

</div>
