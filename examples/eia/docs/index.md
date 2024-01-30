---
theme: [cotton, ink, wide]
toc: false
---

# US electric grid: hourly demand and interchange

This page reenvisions parts of the US Energy Information Administration's [Hourly Electric Grid Monitor]((https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48)). Visit [About the EIA-930 data](https://www.eia.gov/electricity/gridmonitor/about) to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.

```js
// International electricity interchange data:
const countryInterchangeSeries = await FileAttachment("data/country-interchange.csv").csv({typed: true});

// US overall demand, generation, forecast
const usOverview = await FileAttachment("data/us-demand.csv").csv({typed: true});
```

```js
// US total demand, generation and forecast excluding total (sum):
const usDemandGenForecast = usOverview.filter(d => d.name != "Total interchange");
```

```js
// Spatial data

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

```js
// Hourly demand for BAs, demand only & cleaned
const baHourlyDemand = baHourly.filter(d => d.type == "D").map(d => ({ba: d["respondent-name"], baAbb: d["respondent"], period: d.period, value: d.value})); // Only use demand ("D");
```

```js
// Most recent hour for each BA
const baHourlyLatest = d3.rollup(baHourlyDemand, d => d[0].value, d => d["ba"]);
```

```js
// Top 10 BAs by demand, latest hour
// Excludes aggregate values (e.g. US Lower 48)
const top5LatestDemand = Array.from(baHourlyLatest, ([name, value]) => ({ name, value })).filter(d => !["United States Lower 48", "Midwest", "Mid-Atlantic", "Northwest", "Central", "New England", "Southwest", "Southeast", "California", "Florida", "Texas", "Carolinas", "Tennessee", "New York"].includes(d.name)).sort(((a, b) => b.value - a.value)).slice(0, 10);
```

```js
// US most recent total (lower 48) for big number
const baLatestHourlyDemandLower48 = baHourlyDemand.filter(d => d.ba == "United States Lower 48");
```

```js
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


<div class="grid grid-cols-3">
  <div class="card grid-colspan-2 grid-rowspan-2">
    <h2>Change in demand by balancing authority</h2>
    <h3>Percent change in electricity demand from previous hour</h3>
    <h3>Most recent hourly data: ${recentHour.toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${recentHour.toLocaleDateString()}</h3>
    ${
      // Change in hourly demand Plot
Plot.plot({
  color: {domain: [-15, 15], range: ["#4269d0","#4269d0", "white", "#ff725c","#ff725c"], type: "diverging", pivot: 0, legend: true, label: "Change in demand (%) from previous hour" },
  projection: "albers",
  style: "overflow: visible",
  r: { domain: d3.extent(eiaPoints, (d) => d.radius), range: [5, 30] },
  marks: [
    Plot.geo(nation, {stroke: "#6D6D6D", fill: "#6D6D6D", opacity: 0.3}),
    Plot.geo(statemesh, {stroke: "#6D6D6D", opacity: 0.3}),
    //Plot.dot(["Generating BA only", "Missing data"], {y: Plot.identity, r: 5, fill: ["#efb118", "#6d6d6d"], frameAnchor: "left"}),
    //Plot.text(["Generating BA only", "Missing data"], {y: Plot.identity, frameAnchor: "left", dx: 10}),
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
              : d3.format(",")(baHourlyLatest.get(d.name))+"MWh"
          }`,
      })
    )
  ]
})
    }
  </div>
  <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Total US electricity demand</h2>
    <h3>${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleDateString() }</h3>
    <h3>Includes lower 48 states only</h3>
    <span class="big">${d3.format(",")(baLatestHourlyDemandLower48[0].value)} MWh</span>
  </div>
  <div class="card grid-colspan-1 grid-rowspan-1">
  <h2>Top 10 balancing authorities by demand</h2>
  <h3>${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleTimeString('en-us',{timeZoneName:'short'})} on ${timeParse(baLatestHourlyDemandLower48[0].period).toLocaleDateString() }</h3>
    ${
        resize((width) => Plot.plot({
            marginLeft: 250,
            marks: [
                Plot.barX(top5LatestDemand, {y: "name", x: "value", sort: {y: "x", reverse: true, limit: 10}})
            ]
        }))
    }
</div>
  
  
  <div class="card grid-colspan-3 grid-rowspan-1">
  <h2>US generation, demand, and demand forecast</h2>
  <h3>Add subtitle with units</3>
   ${
    Plot.plot({
  marks: [
    Plot.line(usDemandGenForecast, {x: "date", y: "value", stroke: "name"})
  ],
  marginLeft: 70,
  color: {legend: true},
  height: 200, 
  width: 900,
  grid: true
})
   }
  </div>

<div class="card">
  <h2>Country interchange</h2>
  <h3>Add subtitle with units</3>
   ${resize((width) => Plot.plot({
    width,
    color: { legend: true },
    grid: true,
    marginLeft: 70,
    height: 150,
    marks: [
        Plot.areaY(
            countryInterchangeSeries,
            { x: "date", y: "value", curve: "step", fill: "id"}
        ),
        Plot.ruleY([0])
    ]
}))
   }
</div>

Credit: Some code for EIA data access and wrangling is reused from notebooks by Ian Johnson. Thank you Ian!

```js
baHourlyDemand
```