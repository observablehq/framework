# U.S. electricity grid

```js
import {countryInterchangeChart, top5BalancingAuthoritiesChart, usGenDemandForecastChart} from "./components/charts.js";
import {balancingAuthoritiesLegend, balancingAuthoritiesMap} from "./components/map.js";
```

```js
//
// Load data snapshots
//

// International electricity interchange
const countryInterchangeSeries = FileAttachment("data/country-interchange.csv").csv({typed: true});
```

```js
const baHourlyDemand = FileAttachment("data/eia-ba-hourly.csv").csv({typed: true});
```

```js
// BA connections
const eiaConnRef = FileAttachment("data/eia-connections-reference.csv").csv({typed: true});
```

```js
// BA status (generating or not)
const eiaBARef = FileAttachment("data/eia-bia-reference.csv").csv({typed: true});
```

```js
//
// Spatial data (country, states, BA locations)
//

// US states
const us = await FileAttachment("data/us-states.json").json();
const nation = us.features.find(({id}) => id === "nation");
const statemesh = us.features.find(({id}) => id === "statemesh");
```

```js
// Balancing authority representative locations
const eiaPoints = FileAttachment("data/eia-system-points.json").json().then(d => d[0].data);
```

```js
// US total demand, generation and forecast
const usDemandGenForecast = FileAttachment("data/us-demand.csv").csv({typed: true});
```

```js
// Generating only BAs
const genOnlyBA = eiaBARef.filter(d => d["Generation Only BA"] == "Yes").map(d => d["BA Code"]);
```

```js
const baHourlyClean = baHourlyDemand
  .map((d) => ({
    "Date": timeParse(d.period).toLocaleString("en-us", {month: "short", day: "2-digit", hour: "2-digit"}),
    "Balancing authority": d.ba,
    "Abbreviation": d.baAbb,
    "Type": "Demand",
    "Value (GWh)": d.value / 1000
  }));
```

```js
// Most recent hour for each BA
const baHourlyAll = d3.range(0, hoursBackOfData + 1).map((hour) => d3.rollup(baHourlyDemand, (d) => d[hour]?.value, d => d["ba"]));
const baHourlyCurrent = baHourlyAll[hoursAgo];
const baHourlyLatest = baHourlyAll[0];
```

```js
// Top 5 BAs by demand
function computeTopDemand(baHourly) {
  return Array
    .from(baHourly, ([name, value]) => ({name, value}))
    .sort(((a, b) => b.value - a.value))
    .slice(0, 5);
}
const top5LatestDemand = computeTopDemand(baHourlyCurrent);
const maxDemand = d3.max(baHourlyAll.map((demand) => computeTopDemand(demand)[0].value));
```

```js
// Percent change for most recent 2 hours of data by BA
const baHourlyChange = d3.rollup(baHourlyDemand, (d) => ((d[hoursAgo]?.value - d[hoursAgo + 1]?.value) / d[hoursAgo]?.value) * 100, (d) => d["ba"] );
```

```js
// Map BA abbreviations to locations
const locations = new Map(eiaPoints.map(d => [d.id, [d.lon, d.lat]]));
```

```js
// Gets lat/lon endpoints between balancing authorities
const eiaConnRefSpatial = eiaConnRef
  .filter((d) => d["Active Connection"] == "Yes")
  .map((d) => ({
    connection: `${d["BA Code"]}-${d["Directly Interconnected BA Code"]}`,
    location1: locations.get(d["BA Code"]),
    location2: locations.get(d["Directly Interconnected BA Code"])
  }));
```

```js
// Date/time format/parse
const timeParse = d3.utcParse("%Y-%m-%dT%H");
const hourFormat = d3.timeFormat("%-I %p");

// Configure hours ago input
const MS_IN_AN_HOUR = 1000 * 60 * 60;
const hours = [...new Set(baHourlyDemand.map(d => d.period))].map(timeParse);
const [startHour, endHour] = d3.extent(hours);
const hoursBackOfData = Math.ceil(Math.abs(endHour - startHour) / (MS_IN_AN_HOUR)) - 1;
const hoursAgoInput = Inputs.range([hoursBackOfData, 0], {step: 1, value: 0, width: 150});
const hoursAgo = Generators.input(hoursAgoInput);
hoursAgoInput.querySelector("input[type=number]").remove();
```

```js
// Establish current hour and relative day
const currentHour = new Date(endHour.getTime() - hoursAgo * MS_IN_AN_HOUR);
const relativeDay = () => currentHour.getDate() === endHour.getDate() ? "Today" : "Yesterday";
```

```js
function centerResize(render) {
  const div = resize(render);
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.alignItems = "center";
  return div;
}
```

<div class="grid grid-cols-4">
  <div class="card grid-colspan-2 grid-rowspan-3">
    <h2>Change in demand by balancing authority</h2>
    <h3>Percent change in electricity demand from previous hour</h3>
    <figure style="max-width: none;">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <h1 style="margin-top: 0.5rem;">${hourFormat(currentHour)}</h1>
        <div>${relativeDay()}</div>
        <div style="display: flex; align-items: center;">
          <div>-${hoursBackOfData} hrs</div>
          ${hoursAgoInput}
          <div style="padding-left: 0.5rem;">now</div>
        </div>
      </div>
      ${centerResize((width) => balancingAuthoritiesMap({
        baHourlyChange,
        baHourlyLatest,
        eiaConnRefSpatial,
        eiaPoints,
        genOnlyBA,
        nation,
        statemesh,
        width
      }))}
      ${centerResize((width) => balancingAuthoritiesLegend(width))}
      <figcaption>
        Balancing authority location and size are representative. Dates shown in your local time.
      </figcaption>
    </figure>
  </div>
  <div class="card grid-colspan-2">
    <h2>Top 5 balancing authorities by demand at ${hourFormat(currentHour)} ${relativeDay().toLowerCase()} (GWh)</h2>
    ${resize((width, height) => top5BalancingAuthoritiesChart(width, height, top5LatestDemand, maxDemand))}
  </div>
  <div class="card grid-colspan-2">
    <h2>US electricity generation demand vs. day-ahead forecast (GWh)</h2>
    ${resize((width, height) => usGenDemandForecastChart(width, height, usDemandGenForecast, currentHour))}
  </div>
  <div class="card grid-colspan-2">
    <h2>Neighboring country interchange (GWh)</h2>
    ${resize((width, height) => countryInterchangeChart(width, height, usDemandGenForecast, countryInterchangeSeries, currentHour))}
  </div>
</div>

<div class="card" style="padding: 0;">
  ${Inputs.table(baHourlyClean, {rows: 16})}
</div>

<div class="small note">This page reenvisions parts of the US Energy Information Administration’s <a href="https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48">Hourly Electric Grid Monitor</a>. Visit <a href="https://www.eia.gov/electricity/gridmonitor/about">About the EIA-930 data</a> to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.</p>
