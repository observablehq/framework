---
theme: [cotton, ink]
---

# U.S. electricity grid

```js
// International electricity interchange data:
const countryInterchangeSeries = FileAttachment("data/country-interchange.csv").csv({typed: true});

// US overall demand, generation, forecast
const usOverview = FileAttachment("data/us-demand.csv").csv({typed: true});

// Energy by fuel type:
const fuelType = FileAttachment("data/eia-data/fuel-type.csv").csv({typed: true});

// Subregion hourly demand:
const subregionDemand = FileAttachment("data/eia-data/subregion-hourly.csv").csv({typed: true});
```

```js
// US total demand, generation and forecast excluding total (sum):
const usDemandGenForecast = usOverview.filter(d => d.name != "Total interchange");
```

```js
// Spatial data (country, states, BA locations)

// US states
const us = await FileAttachment("data/us-counties-10m.json").json();
const nation = topojson.feature(us, us.objects.nation);
const statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

// Balancing authority representative locations
const eiaPoints = await FileAttachment("data/eia-system-points.json").json().then(d => d[0].data);
```

```js
// Interchange amounts between BAs
const baInterchange = FileAttachment("data/eia-data/ba-interchange.csv").csv({typed: true});

// Hourly demand for each BA
const baHourly = FileAttachment("data/eia-data/ba-hourly.csv").csv({typed: true});

// Data on BA connections:
// From static file in docs
const eiaConnRef = await FileAttachment("data/eia-connections-reference.csv").csv({typed: true});

//Data on BA status (generating or not)
// From static file in docs
const eiaBARef = await FileAttachment("data/eia-bia-reference.csv").csv({typed: true});
```

```js
// Generating only BAs
const genOnlyBA = eiaBARef.filter(d => d["Generation Only BA"] == "Yes").map(d => d["BA Code"]);
```

<!-- TODO update to exclude regions -->

```js
// Hourly demand for BAs, demand only & cleaned
// TODO: Update to exclude regions!!! Otherwise these show up over the BAs
const baHourlyDemand = baHourly.filter(d => d.type == "D").map(d => ({ba: d["respondent-name"], baAbb: d["respondent"], period: d.period, 'type-name': d["type-name"], value: d.value})); // Only use demand ("D");
```

```js
// Cleaned up baHourly for table, excludes regions (only shows BAs)
const baHourlyClean = baHourly.filter(d => !regions.includes(d["respondent-name"])).map(d => ({Date: timeParse(d.period).toLocaleString('en-us',{timeZoneName:'short'}), 'Balancing authority': d["respondent-name"], Abbreviation: d.respondent, Type: d['type-name'], 'Value (GWh)': d.value / 1000}))
```

```js
// Most recent hour for each BA
const baHourlyLatest = d3.rollup(baHourlyDemand, d => d[0].value, d => d["ba"]);
```

```js
// Top 5 BAs by demand, latest hour
// Excludes regions

const regions = ["California", "Carolinas", "Central", "Florida", "Mid-Atlantic", "Midwest", "New England", "New York", "Northwest", "Southeast", "Southwest", "Tennessee", "Texas", "United States Lower 48"];

const top5LatestDemand = Array.from(baHourlyLatest, ([name, value]) => ({ name, value })).filter(d => !regions.includes(d.name)).sort(((a, b) => b.value - a.value)).slice(0, 5);
```

```js
// US most recent total (lower 48) for big number
const baLatestHourlyDemandLower48 = baHourlyDemand.filter(d => d.ba == "United States Lower 48");
```

```js
// Percent change for most recent 2 hours of data by BA
const baHourlyChange = d3.rollup(baHourlyDemand, d => ((d[0].value - d[1].value) / d[1].value) * 100, d => d["ba"] );
```

```js
// Map BA abbreviations to locations
const locations = new Map(eiaPoints.map(d => [d.id, [d.lon, d.lat]]));

// BA interchange spatial endpoints
const baInterchangeSp = baInterchange.map(d => ({...d, location1: locations.get(d["fromba"]), location2: locations.get(d["toba"])}));
```

```js
// Gets lat/lon endpoints between balancing authorities
const eiaConnRefSpatial = eiaConnRef.filter(d => d["Active Connection"] == "Yes").
map((d) => ({
  connection: `${d["BA Code"]}-${d["Directly Interconnected BA Code"]}`,
  location1: locations.get(d["BA Code"]),
  location2: locations.get(d["Directly Interconnected BA Code"])
}));
```

```js
// Make time parser
const timeParse = d3.utcParse("%Y-%m-%dT%H");
```

```js
// Get the most recent hour (time) of data
const recentHour = timeParse(baHourly.filter(d => d.type == "D")[0].period);
```

```js
// treemap data (sub-ba, ba, region, country)
subregionDemand
```

```js
eiaBARef
```

```js
const baRegionMap = new Map(eiaBARef.map(d => [d['BA Code'], d['Region/Country Name']]));
```

```js
baRegionMap
```

```js
const treemapData = subregionDemand.map(d => ({...d, region: baRegionMap.get(d.parent), valueGwh: d.value / 1000})).filter(d => d.subba == "PGAE")
```

```js
treemapData
```


```js
const color = Plot.scale({
  color: {
    type: "linear",
    domain: [-1, -.1501, -.15, 0, .15, .1501, 1],
    range: ["darkblue", "darkblue", "steelblue", "white", "orange", "darkorange", "darkorange"]
  }
});
const colorGenerating = "#efb118";
const colorUnavailable = "gray";
```

<div class="grid grid-cols-4" style="grid-auto-rows: 180px;">
  <div class="card grid-colspan-2 grid-rowspan-3">
    <h2>Change in demand by balancing authority</h2>
    <h3>Percent change in electricity demand from previous hour</h3>
    <h3>Most recent hourly data: ${recentHour.toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${recentHour.toLocaleDateString()}</h3>
  ${resize((width, height) => html`<div>${
Plot.plot({
  width: Math.min(width - 30, 400),
  height: 42,
  y: { axis: null },
  marks: [
    Plot.raster({
      y1: 0,
      y2: 1,
      x1: -.19,
      x2: .19,
      fill: (x, y) => color.apply(x)
    }),
    Plot.ruleX([-.15, 0, .15], { insetBottom: -5 }),
    Plot.axisX([-.15, 0, .15], { tickFormat: d3.format("+.0%"), tickSize: 0 }),
    Plot.dot(["Generating only", "Unavailable"], {
      x: [.23, .40],
      r: 5,
      dx: -8,
      fill: [colorGenerating, colorUnavailable],
      stroke: "grey"
    }),
    Plot.text(["Generating only", "Unavailable"], {
      x: [.23, .40],
      textAnchor: "start"
    })
  ]
})}${
Plot.plot({
    width: Math.min(width, 620),
    height: Math.min(width, 620) * 0.7,
    caption:
      "Data: US Energy Information Administration. Locations are representative.",
    color: {
      ...color,
      transform: (d) => d / 100,
      label: "Change in demand (%) from previous hour"
    },
    projection: {
      type: "albers",
      insetTop: 15,
    },
    r: {
      domain: d3.extent(eiaPoints, (d) => d.radius),
      range: [4, 30]
    },
    marks: [
      Plot.geo(nation, { fill: "currentColor", fillOpacity: 0.1,  stroke: "var(--theme-background-alt)" }),
      Plot.geo(statemesh, { stroke: "var(--theme-background-alt)", strokeWidth: 0.8}),
      Plot.arrow(eiaConnRefSpatial, {
        filter: (d) => d.location1[0] > d.location2[0],
        x1: (d) => d.location1[0],
        y1: (d) => d.location1[1],
        x2: (d) => d.location2[0],
        y2: (d) => d.location2[1],
        stroke: "currentColor",
        strokeWidth: 0.5,
        opacity: 0.7,
        bend: 7,
        headLength: 0
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: "radius",
        stroke: "gray",
        strokeWidth: 1,
        filter: (d) => isNaN(baHourlyChange.get(d.name)) && !(d.region_id === "MEX" || d.region_id === "CAN"),
        fill: "#6D6D6D"
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: 4,
        symbol: "square",
        stroke: "gray",
        strokeWidth: 1,
        filter: (d) => d.region_id === "MEX" || d.region_id === "CAN",
        fill: "#6D6D6D"
      }),
      Plot.dot(eiaPoints, {
        filter: (d) => genOnlyBA.includes(d.id),
        x: "lon",
        y: "lat",
        r: "radius",
        fill: colorGenerating,
        stroke: "gray",
        strokeWidth: 1
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: "radius",
        stroke: colorUnavailable,
        strokeWidth: 1,
        filter: (d) => !isNaN(baHourlyChange.get(d.name)),
        fill: (d) => baHourlyChange.get(d.name)
      }),
      Plot.text(eiaPoints, {
        x: "lon",
        y: "lat",
        text: (d) => (d.radius > 10000 ? d.id : null),
        fontWeight: 800,
        fill: "black"
      }),
      Plot.tip(
        eiaPoints,
        Plot.pointer({
          x: "lon",
          y: "lat",
          title: (d) =>
            `${d.name} (${d.id})\nChange from previous hour: ${
              isNaN(baHourlyChange.get(d.name))
                ? "Unavailable"
                : baHourlyChange.get(d.name).toFixed(1) + "%"
            }\nLatest hourly demand: ${
              isNaN(baHourlyLatest.get(d.name))
                ? "Unavailable"
                : (baHourlyLatest.get(d.name) / 1000).toFixed(2) + " GWh"
            }`
        })
      )
    ]
  })}</div>`
)}</div>
  <div class="card grid-colspan-2 grid-rowspan-1">
  <h2>Top balancing authorities by demand, latest hour (GWh)</h2>
  <h3>${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleDateString() }</h3>
  ${
        resize((width, height) => Plot.plot({
            marginTop: 0,
            marginLeft: 250,
            height: height - 20,
            width,
            y: {label: null},
            x: {label: null, grid: true},
            marks: [
                Plot.barX(top5LatestDemand, {y: "name", x: d => d.value / 1000, fill: "gray", sort: {y: "x", reverse: true, limit: 10}}),
                Plot.ruleX([0])
            ]
        }))
    }
    </div>
  <div class="card grid-colspan-2 grid-rowspan-1">
<h2>US electricity generation, demand, and demand forecast (GWh)</h2>
   ${resize((width, height) => Plot.plot({
    width, 
    marginTop:0,
    height: height - 50,
    y: {label: null},
    x: {type: "time"},
    color: {legend: true, domain: ["Day-ahead demand forecast", "Demand", "Net generation"],
    range: ["#97bbf5", "#4269d0", "#efb118"]},
    grid: true,
    marks: [
        Plot.line(usDemandGenForecast, {x: "date", y: d => d.value / 1000, stroke: "name", strokeWidth: 2, tip: true})
        ]
}))
   }
  </div>
  <div class="card grid-colspan-2 grid-rowspan-1">
  <h2>Neighboring country interchange (GWh)</h2>
   ${resize((width, height) => Plot.plot({
    width,
    marginTop: 0,
    height: height - 50,
    color: { legend: true, range: ["#B6B5B1", "gray"]},
    grid: true,
    y: {label: null},
    x: {type: "time", domain: d3.extent(usDemandGenForecast.map(d => d.date))},
    marks: [
        Plot.areaY(
            countryInterchangeSeries,
            { x: "date", y: d => d.value / 1000, curve: "step", fill: "id", tip: true}
        ),
        Plot.ruleY([0])
    ]
}))
   }
</div>
</div>

<div class="card" style="padding: 0">
 ${Inputs.table(baHourlyClean, {rows: 16})}
</div>

<!-- Unused US total bign number
      <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Total US electricity demand</h2>
    <h3>${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleDateString() }</h3>
    <span class="big">${d3.format(",")(baLatestHourlyDemandLower48[0].value)} MWh</span>
  </div>
<div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Placeholder</h2>
  </div>
-->

This page reenvisions parts of the US Energy Information Administration's [Hourly Electric Grid Monitor](<(https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48)>). Visit [About the EIA-930 data](https://www.eia.gov/electricity/gridmonitor/about) to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.

Some code for EIA data access and wrangling is reused from Observable notebooks by Ian Johnson. Thank you Ian!
