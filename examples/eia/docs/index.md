---
theme: [cotton, sun-faded]
---

# US energy grid

Data source: Energy Information Administration

<!-- SECTION 1: International interchange -->

```js
// International electricity interchange data:
const countryInterchangeSeries = await FileAttachment("data/country-interchange.csv").csv({typed: true});
```

<!-- SECTION 2: US total demand, generation, forecasting -->

```js
// US overall demand, generation, forecast
const usOverview = FileAttachment("data/us-demand.csv").csv({typed: true});
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


<div class="grid grid-cols-3">
  <div class="card grid-colspan-2 grid-rowspan-2">
    <h2>Electricity demand by balancing authority</h2>
    <h3>Add subtitle with time and units</h3>
    ${
      // Change in hourly demand Plot
Plot.plot({
  color: {domain: [-15, 15], range: ["#4269d0","#4269d0", "white", "#ff725c","#ff725c"], type: "diverging", pivot: 0, legend: true, label: "Change in demand (%) from previous hour" },
  projection: "albers",
  height: 500,
  width: 900,
  insetTop: 40,
  style: "overflow: visible",
  r: { domain: d3.extent(eiaPoints, (d) => d.radius), range: [5, 30] },
  marks: [
    Plot.geo(nation, {stroke: "#6D6D6D", fill: "#6D6D6D", opacity: 0.5}),
    Plot.geo(statemesh, {stroke: "#6D6D6D", opacity: 0.4}),
    //Plot.arrow(eiaConnectionsFull, {x1: "lon1", x2: "lon2", y1: "lat1", y2: "lat2", stroke: "gray", strokeWidth: 0.7, headLength: 0}),
    Plot.dot(eiaPoints, { 
      x: "lon",
      y: "lat",
      r: "radius",
      stroke: "gray",
      strokeWidth: 1,
      filter: (d) => isNaN(baHourlyChange.get(d.name)),
      fill: "#ededed"
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
    <p>Tortor condimentum lacinia quis vel eros. Arcu risus quis varius quam quisque id. Magnis dis parturient montes nascetur ridiculus mus mauris. Porttitor leo a diam sollicitudin. Odio facilisis mauris sit amet massa vitae tortor. Nibh venenatis cras sed felis eget velit aliquet sagittis. Ullamcorper sit amet risus nullam eget felis eget nunc. In egestas erat imperdiet sed euismod nisi porta lorem mollis. A erat nam at lectus urna duis convallis. Id eu nisl nunc mi ipsum faucibus vitae. Purus ut faucibus pulvinar elementum integer enim neque volutpat ac.</p>
  </div>
    <div class="card grid-colspan-1 grid-rowspan-1">
    <p>Tortor condimentum lacinia quis vel eros. Arcu risus quis varius quam quisque id. Magnis dis parturient montes nascetur ridiculus mus mauris. Porttitor leo a diam sollicitudin. Odio facilisis mauris sit amet massa vitae tortor. Nibh venenatis cras sed felis eget velit aliquet sagittis. Ullamcorper sit amet risus nullam eget felis eget nunc. In egestas erat imperdiet sed euismod nisi porta lorem mollis. A erat nam at lectus urna duis convallis. Id eu nisl nunc mi ipsum faucibus vitae. Purus ut faucibus pulvinar elementum integer enim neque volutpat ac.</p>
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
  <div class="card grid-colspan-3 grid-rowspan-1">
  <h2>Country interchange</h2>
  <h3>Add subtitle with units</3>
   ${Plot.plot({
    width: 900,
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
})
   }
  </div>
</div>


```js
const baInterchange = FileAttachment("data/eia-data/ba-interchange.csv").csv({typed: true});

const baHourly = FileAttachment("data/eia-data/ba-hourly.csv").csv({typed: true});

// Data on BA connections:
// From static file in docs
const eiaConnectionsRef = await FileAttachment("data/eia-connections-reference.csv").csv({typed: true});

//Data on BA status (generating or not)
// From static file in docs
const eiaBARef = await FileAttachment("data/eia-bia-reference.csv").csv({typed: true});
```

```js 
const genOnlyBA = eiaBARef.filter(d => d["Generation Only BA"] == "Yes").map(d => d["BA Code"]);
```

```js
const baHourlyDemand = baHourly.filter(d => d.type == "D").map(d => ({ba: d["respondent-name"], period: d.period, value: d.value})); // Only use demand ("D");
```

```js
const baHourlyLatest = d3.rollup(baHourlyDemand, d => d[0].value, d => d["ba"]);
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