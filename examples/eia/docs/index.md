---
toc: false
theme: [air, near-midnight, wide]
---

# U.S. electricity grid

```js
import {
  countryInterchangeChart,
  top5BalancingAuthoritiesChart,
  usGenDemandForecastChart
} from "./components/charts.js";

import {
  balancingAuthoritiesLegend,
  balancingAuthoritiesMap,
} from "./components/map.js";
```

```js
//
// Load data snapshots
//

// International electricity interchange
const countryInterchangeSeries = FileAttachment("data/country-interchange.csv").csv({typed: true});

// US overall demand, generation, forecast
const usOverview = FileAttachment("data/us-demand.csv").csv({typed: true});

// Energy by fuel type
const fuelType = FileAttachment("data/eia-data/fuel-type.csv").csv({typed: true});

// Subregion hourly demand
const subregionDemand = FileAttachment("data/eia-data/subregion-hourly.csv").csv({typed: true});

// Interchange amounts between Balancing Authorities (BA)
const baInterchange = FileAttachment("data/eia-data/ba-interchange.csv").csv({typed: true});

// Hourly demand for each BA
const baHourly = await FileAttachment("data/eia-data/ba-hourly.csv").csv({typed: true});

// BA connections
const eiaConnRef = await FileAttachment("data/eia-connections-reference.csv").csv({typed: true});

// BA status (generating or not)
const eiaBARef = await FileAttachment("data/eia-bia-reference.csv").csv({typed: true});

const regions = ["California", "Carolinas", "Central", "Florida", "Mid-Atlantic", "Midwest", "New England", "New York", "Northwest", "Southeast", "Southwest", "Tennessee", "Texas", "United States Lower 48"];
```

```js
//
// Spatial data (country, states, BA locations)
//

// US states
const us = await FileAttachment("data/us-states.json").json();
const nation = us.features.find(({id}) => id === "nation");
const statemesh = us.features.find(({id}) => id === "statemesh");

// Balancing authority representative locations
const eiaPoints = await FileAttachment("data/eia-system-points.json").json().then(d => d[0].data);
```

```js
// US total demand, generation and forecast excluding total (sum)
const usDemandGenForecast = usOverview.filter(d => d.name != "Total interchange");
```

```js
// Generating only BAs
const genOnlyBA = eiaBARef.filter(d => d["Generation Only BA"] == "Yes").map(d => d["BA Code"]);
```

```js
// Hourly demand for BAs, demand only & cleaned
// TODO: Update to exclude regions!!! Otherwise these show up over the BAs
const baHourlyDemand = baHourly
  .filter(d => d.type == "D")  // Only use demand ("D")
  .map(d => ({ba: d["respondent-name"], baAbb: d["respondent"], period: d.period, 'type-name': d["type-name"], value: d.value})); 
```

```js
// Cleaned up baHourly for table, excludes regions (only shows BAs)
const baHourlyClean = baHourly
  .filter(d => !regions.includes(d["respondent-name"]))
  .map(d => ({
    Date: timeParse(d.period).toLocaleString('en-us',{timeZoneName:'short'}), 
    'Balancing authority': d["respondent-name"], 
    Abbreviation: d.respondent, 
    Type: d['type-name'], 
    'Value (GWh)': d.value / 1000
  }));
```

```js
// Most recent hour for each BA
const baHourlyLatest = d3.rollup(baHourlyDemand, d => d[0].value, d => d["ba"]);
const baHourlyAll = d3.range(0, hoursBackOfData + 1).map(hour => d3.rollup(baHourlyDemand, d => d[hour]?.value, d => d["ba"]));
const baHourlyCurrent = baHourlyAll[hoursAgo];
```

```js
// Top 5 BAs by demand
function computeTopDemand(baHourly) {
  return Array
    .from(baHourly, ([name, value]) => ({ name, value }))
    .filter(d => !regions.includes(d.name))  // Exclude regions
    .sort(((a, b) => b.value - a.value)).slice(0, 5);
}
const top5LatestDemand = computeTopDemand(baHourlyCurrent);
const maxDemand = d3.max(baHourlyAll.map(demand => computeTopDemand(demand)[0].value));
```

```js
// US most recent total (lower 48) for big number
const baLatestHourlyDemandLower48 = baHourlyDemand.filter(d => d.ba == "United States Lower 48");
```

```js
// Percent change for most recent 2 hours of data by BA
const baHourlyChange = d3.rollup(baHourlyDemand, d => ((d[hoursAgo]?.value - d[hoursAgo + 1]?.value) / d[hoursAgo]?.value) * 100, d => d["ba"] );
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
map(d => ({
  connection: `${d["BA Code"]}-${d["Directly Interconnected BA Code"]}`,
  location1: locations.get(d["BA Code"]),
  location2: locations.get(d["Directly Interconnected BA Code"])
}));
```

```js
// Date/time format/parse
const timeParse = d3.utcParse("%Y-%m-%dT%H");
const hourFormat = d3.timeFormat("%I %p");

// Configure hours ago input
const MS_IN_AN_HOUR = 1000 * 60 * 60;
const hours = [...new Set(baHourlyDemand.map(d => d.period))].map(timeParse);
const [startHour, endHour] = d3.extent(hours);
const hoursBackOfData = Math.ceil(Math.abs(endHour - startHour) / (MS_IN_AN_HOUR)) - 1;
const hoursAgoInput = Inputs.range([hoursBackOfData, 0], { step: 1, value: 0, width: 150 });
const hoursAgo = view(hoursAgoInput);
```

```js
// Establish current hour and relative day
const currentHour = new Date(endHour.getTime() - hoursAgo * MS_IN_AN_HOUR);
const relativeDay = () => currentHour.getDate() === endHour.getDate() ? "Today" : "Yesterday";
```

<div class="grid grid-cols-4" style="grid-auto-rows: 190px;">
  <div class="card grid-colspan-2 grid-rowspan-3" style="position: relative;">
    <h2>Change in demand by balancing authority</h2>
    <h3>Percent change in electricity demand from previous hour</h3>
    <div>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <h1 style="margin-bottom: 0; margin-top: 8px;">${hourFormat(currentHour)}</h1> 
        <div>${relativeDay()}</div>
        <div style="display: flex; align-items: center;">
          <style>input[type="number"] { display: none; }</style>
          <div>-${hoursBackOfData} hrs</div>
          ${hoursAgoInput}
          <div style="padding-left: 0.5em;">now</div>
        </div>
      </div>
      ${resize((width) => balancingAuthoritiesMap({
        baHourlyChange,
        baHourlyLatest,
        eiaConnRefSpatial,
        eiaPoints,
        genOnlyBA,
        nation,
        statemesh,
        width
      }))}
      ${resize((width) => balancingAuthoritiesLegend(width))}
    </div>
    <footer id="observablehq-footer" style="position: absolute; bottom: 0em;">
      Balancing authority location and size are representative.
    </footer>
  </div>
  <div class="card grid-colspan-2 grid-rowspan-1">
    <h2>Top 5 balancing authorities by demand at ${hourFormat(currentHour)} ${relativeDay().toLowerCase()} (GWh)</h2>
    ${resize((width, height) => top5BalancingAuthoritiesChart(width, height, top5LatestDemand, maxDemand))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-1">
    <h2>US electricity generation, demand, and demand forecast (GWh)</h2>
    ${resize((width, height) => usGenDemandForecastChart(width, height, usDemandGenForecast, currentHour))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-1">
    <h2>Neighboring country interchange (GWh)</h2>
    ${resize((width, height) => countryInterchangeChart(width, height, usDemandGenForecast, countryInterchangeSeries, currentHour))}
  </div>
</div>

<div class="card" style="padding: 0;">
  <div style="border-radius: 12px; overflow: hidden;">
    ${Inputs.table(baHourlyClean, {rows: 16})}
  </div>
</div>

This page reenvisions parts of the US Energy Information Administration's [Hourly Electric Grid Monitor](<(https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48)>). Visit [About the EIA-930 data](https://www.eia.gov/electricity/gridmonitor/about) to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.

Some code for EIA data access and wrangling is reused from Observable notebooks by Ian Johnson. Thank you Ian!
