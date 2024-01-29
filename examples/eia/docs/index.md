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

<!-- Testing cards -->

<div class="grid grid-cols-3">
  <div class="card grid-colspan-2 grid-rowspan-2">
    <h2>Electricity demand by balancing authority</h2>
    <h3>Add subtitle with time and units</h3>
    ${
      Plot.plot({
        projection: "albers",
        marks: [
            Plot.geo(nation),
            Plot.geo(statemesh),
            Plot.dot(eiaPoints, {x: "lon", y: "lat"})
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
