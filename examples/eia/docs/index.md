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
subregionDemand
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
// Map longitudes to BA abbreviations
const pointsMapLon = new Map(eiaPoints.map(d => [d.id, d.lon]));

// Map latitudes to BA abbreviations
const pointsMapLat = new Map(eiaPoints.map(d => [d.id, d.lat]));

// BA interchange spatial endpoints
const baInterchangeSp = baInterchange.map(d => ({...d, lat1: pointsMapLat.get(d["fromba"]), lon1: pointsMapLon.get(d["fromba"]), lat2: pointsMapLat.get(d["toba"]), lon2: pointsMapLon.get(d["toba"])}));
```

```js
// Gets lat/lon endpoints between balancing authorities
const eiaConnRefSpatial = eiaConnRef.filter(d => d["Active Connection"] == "Yes").
map(
    d => ({connection: d["BA Code"]+"-"+d["Directly Interconnected BA Code"],
    lat1: pointsMapLat.get(d["BA Code"]), 
    lon1: pointsMapLon.get(d["BA Code"]), 
    lat2: pointsMapLat.get(d["Directly Interconnected BA Code"]), 
    lon2: pointsMapLon.get(d["Directly Interconnected BA Code"])
    })
    )
```

```js
// Make time parser
const timeParse = d3.utcParse("%Y-%m-%dT%H");
```

```js
// Get the most recent hour of data
const recentHour = timeParse(baHourly.filter(d => d.type == "D")[0].period);
```


<div class="grid grid-cols-4" style="grid-auto-rows: 180px;">
  <div class="card grid-colspan-2 grid-rowspan-3">
    <h2>Change in demand by balancing authority</h2>
    <h3>Percent change in electricity demand from previous hour</h3>
    <h3>Most recent hourly data: ${recentHour.toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${recentHour.toLocaleDateString()}</h3>
    ${resize((width, height) => Plot.plot({
        width,
        height: height - 120,
        caption: "Data: US Energy Information Administration. Locations are representative.",
        color: {domain: [-15, 15], range: ["#4269d0","#4269d0", "white", "#ff725c","#ff725c"], type: "diverging", pivot: 0, legend: true, label: "Change in demand (%) from previous hour" },
        projection: "albers",
        style: "overflow: visible",
        r: { domain: d3.extent(eiaPoints, (d) => d.radius), range: [5, 30] },
        marks: [
            Plot.geo(nation, {stroke: "white", fill: "#6D6D6D", opacity: 0.3}),Plot.geo(statemesh, {stroke: "#6D6D6D", opacity: 0.3}),
            Plot.dot([1], {y: Plot.identity, r: 5, fill: "#efb118", stroke: "gray", strokeWidth: 1, frameAnchor: "left", dy: -27, dx: 280}),
            Plot.dot([1], {y: Plot.identity, r: 5, fill: "#6d6d6d", stroke: "gray", strokeWidth: 1, frameAnchor: "left", dy: -27, dx: 380}),
            Plot.text(["Generating only"], {y: Plot.identity, dx: 290, dy: -25, frameAnchor: "left"}),
            Plot.text(["Unavailable"], {y: Plot.identity, dx: 390, dy: -25, frameAnchor: "left"}),
            Plot.arrow(eiaConnRefSpatial, {x1: "lon1", x2: "lon2", y1: "lat1", y2: "lat2", stroke: "gray", strokeWidth: 0.7, headLength: 0}),
            Plot.dot(eiaPoints, { 
                x: "lon",
                y: "lat",
                r: "radius",
                stroke: "gray",
                strokeWidth: 1,
                filter: (d) => isNaN(baHourlyChange.get(d.name)),
                fill: "#6D6D6D"
            }),
            Plot.dot(eiaPoints, {
                filter: d => genOnlyBA.includes(d.id),
                x: "lon",
                y: "lat",
                r: "radius",
                fill: "#efb118",
                stroke: "gray",
                strokeWidth: 1
            }),
            Plot.dot(eiaPoints, {
                x: "lon",
                y: "lat",
                r: "radius",
                stroke: "gray",
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
            Plot.tip(eiaPoints,
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
              : (baHourlyLatest.get(d.name) / 1000).toFixed(2)+" GWh"
          }`,
      })
    )
  ]
}))
    }
  </div>
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

This page reenvisions parts of the US Energy Information Administration's [Hourly Electric Grid Monitor]((https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48)). Visit [About the EIA-930 data](https://www.eia.gov/electricity/gridmonitor/about) to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange. 

Some code for EIA data access and wrangling is reused from Observable notebooks  by Ian Johnson. Thank you Ian!