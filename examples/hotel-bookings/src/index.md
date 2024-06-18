---
toc: false
theme: [air, ocean-floor, wide]
---

# Hotel reservations by market segment

## Excludes complementary reservations

```js
import {DonutChart} from "./components/donutChart.js";
import {bigNumber} from "./components/bigNumber.js";

const hotelData = FileAttachment("data/hotelData.csv").csv({typed: true});
```

```js
// Radio button input to choose market segment
const pickMarketSegmentInput = Inputs.radio(
  ["All"].concat(hotelData.filter((d) => d.MarketSegment != "Complementary").map((d) => d.MarketSegment)),
  {
    label: "Booking type:",
    value: "All",
    unique: true
  }
);
const pickMarketSegment = Generators.input(pickMarketSegmentInput);
```

${pickMarketSegmentInput}

## ${pickMarketSegment} bookings

```js
const countryOrder = ["PRT", "ESP", "GBR", "DEU", "FRA", "IRL", "AUT", "Other", "Unknown"];

const countryColors = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e"
];
```

<div class="grid grid-cols-4">
  <div class="card grid-rowspan-2">
    ${resize(width => DonutChart(byCountry, {centerText: "Guest nationality", width, colorDomain: countryOrder, colorRange: countryColors}))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => DonutChart(byBookingOutcome, {centerText: "Status", width, colorDomain: ["Cancel", "Keep"], colorRange: ["#525252", "#8b8b8b"]}))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize((width) => DonutChart(bookingSeason, {centerText: "Visit season", width, colorDomain: seasonDomain, colorRange: seasonColors}))}
  </div>
  <div class="card grid-rowspan-1">
    ${resize((width) => bigNumber(`Number of bookings, ${pickMarketSegment}`, datesExtent, `${d3.format(",")(bookingsByMarketSegment.length)}`, `${d3.format(".1%")(bookingsByMarketSegment.length / bookingsAll.length)} of all bookings`, width))}
  </div>
  <div class="card grid-rowspan-1">
    ${resize((width) => bigNumber(`Average daily rate`, datesExtent, `$${d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2)}`, `${pickMarketSegment == "All" ? `` : d3.format("$.2f")(Math.abs(rateDiffFromAverage))} ${rateDiffFromAverage > 0 ? `greater than average rate` : rateDiffFromAverage === 0 ? `` : `less than average rate`}`, width))}
  </div>
</div>

<div class="grid card" style="height: 250px">
    ${resize((width, height) => arrivalLineChart(width, height))}
</div>

<div class="grid grid-cols-2"">
  <div class="card grid-colspan-1">
    <h2>Bookings by room type and season</h2>
    <h3>Market segment: ${pickMarketSegment}</h3>
    ${resize((width) => typeSeasonChart(width))}
  </div>
  <div class="card grid-colspan-1">
    <h2>${pickMarketSegment} reservations: rate distribution by season</h2>
    ${resize((width, height) => dailyRateChart(width, height))}
  </div>
</div>

<div class="card" style="padding: 0">
  <div style="padding: 1em">
    ${display(tableSearch)}
  </div>
  ${display(Inputs.table(tableSearchValue, {
      columns: [
        "arrivalDate", 
        "ADR", 
        "Arrival date", 
        "ReservedRoomType", 
        "MarketSegment", 
        "Country", 
        "Adults",
        "Children", 
        "LeadTime", 
        "IsCanceled"
      ],
      header: 
        {
          arrivalDate: "Arrival date", 
          ADR: "Average rate", 
          ReservedRoomType: "Room type", 
          MarketSegment: "Booking type", 
          Country: "Guest country", 
          Adults: "Adults", 
          Children: "Children", 
          LeadTime: "Lead time", 
          IsCanceled: "Status"
          },
        width: {arrivalDate: 100},
        format: {arrivalDate: d3.utcFormat("%d %b %Y")}
        }
      ))}
</div>

**Data source:** Antonio et al (2021). Hotel booking demand datasets. Data in Brief (22): 41-49. https://doi.org/10.1016/j.dib.2018.11.126

```js
// Filtered data for selected market segment
const bookingsByMarketSegment =
  pickMarketSegment == "All"
    ? hotelData.filter((d) => d.MarketSegment != "Complementary")
    : hotelData.filter((d) => d.MarketSegment == pickMarketSegment && d.MarketSegment != "Complementary");

// All bookings data (except complementary)
const bookingsAll = hotelData.filter((d) => d.MarketSegment != "Complementary");

// Bookings by nationality
const bookingCountry = d3
  .rollups(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.Country
  )
  .map(([name, value]) => ({name, value}))
  .sort((a, b) => d3.descending(a.value, b.value));

// Limit to top 5
const bookingCountryTopN = bookingCountry.slice(0, 5);

// Bin the rest as "Other"
const bookingCountryOther = {
  name: "Other",
  value: d3.sum(bookingCountry.slice(5 - bookingCountry.length), (d) => d.value)
};

// Combine top 5 countries and "other" for donut chart
const byCountry = bookingCountryTopN.concat(bookingCountryOther);

//Booking status (cancelled or not cancelled)
const byBookingOutcome = d3
  .rollups(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.IsCanceled
  )
  .map(([name, value]) => ({name, value}))
  .sort((a, b) => d3.descending(a.value, b.value));

// Bookings by room type
const byRoomType = d3
  .rollups(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.ReservedRoomType
  )
  .map(([name, value]) => ({name, value}))
  .sort((a, b) => d3.descending(a.value, b.value));

// Bookings by season
const bookingSeason = d3
  .rollups(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.season
  )
  .map(([name, value]) => ({name, value}));

// Find & format arrival date extent for big number
const arrivalDates = d3.extent(bookingsAll, (d) => d.arrivalDate);

const datesExtent = [
  d3.timeFormat("%b %d, %Y")(new Date(arrivalDates[0])),
  d3.timeFormat("%b %d, %Y")(new Date(arrivalDates[1]))
];

// Calculate rate difference from total average for big number
const rateDiffFromAverage = d3.mean(bookingsByMarketSegment, (d) => d.ADR) - d3.mean(bookingsAll, (d) => d.ADR);
```

```js
// Create search input (for searchable table)
const tableSearch = Inputs.search(bookingsAll);

const tableSearchValue = view(tableSearch);
```

```js
// Line chart (arrival dates)
let mem;
function firstOrRecent(values) {
  return values.length ? (mem = values[0]) : mem;
}
function arrivalLineChart(width, height) {
  return Plot.plot({
    height: height - 50,
    marginBottom: 35,
    width,
    x: {label: "Arrival date"},
    y: {label: "Bookings", grid: true},
    color: {domain: seasonDomain, range: seasonColors, label: "Season"},
    title: `${pickMarketSegment} bookings by arrival date`,
    subtitle: `Daily reservation counts (gray area) and 28-day moving average (solid line).`,
    marks: [
      () => htl.svg`<defs>
      <linearGradient id="gradient" gradientTransform="rotate(90)">
        <stop offset="60%" stop-color="#B5B5B5" stop-opacity="0.7" />
        <stop offset="100%" stop-color="#B5B5B5" stop-opacity="0.1" />
      </linearGradient>
      </defs>`,
      Plot.areaY(
        bookingsByMarketSegment,
        Plot.binX(
          {y: "count", thresholds: "day", filter: null},
          {
            x: "arrivalDate",
            curve: "step",
            fill: "url(#gradient)"
          }
        )
      ),
      Plot.lineY(
        bookingsByMarketSegment,
        Plot.windowY(
          {k: 28},
          Plot.binX(
            {y: "count", interval: "day", stroke: firstOrRecent, filter: null},
            {
              x: "arrivalDate",
              strokeWidth: 2,
              stroke: "season",
              z: null,
              tip: {
                format: {
                  arrivalDate: true,
                  bookings: true,
                  x: "%d %b %Y"
                }
              }
            }
          )
        )
      ),
      Plot.ruleY([0]),
      Plot.axisX({ticks: 5}),
      Plot.axisY({ticks: 5})
    ]
  });
}
```

```js
//Create faceted histograms of daily rate

// Season color scheme
const seasonColors = ["#959C00", "#9C5A00", "#465C9C", "#109F73"];
const seasonDomain = ["Summer", "Fall", "Winter", "Spring"];

// Calculate mean daily rate by season (for rule mark)
const meanRateBySeason = d3
  .rollups(
    bookingsByMarketSegment,
    (v) => d3.mean(v, (d) => d.ADR),
    (d) => d.season
  )
  .map(([season, value]) => ({season, value}));

// Build daily rate faceted histograms
const dollarFormat = d3.format("$.2f");
const defaultFormat = d3.format(",");
function dailyRateChart(width, height) {
  return Plot.plot({
    width,
    height: height - 20,
    marginLeft: 30,
    marginRight: 0,
    marginTop: 10,
    marginBottom: 30,
    x: {label: "Average rate($)", grid: true},
    y: {nice: true, label: null},
    axis: null,
    fy: {label: "Season", domain: seasonDomain},
    color: {domain: seasonDomain, range: seasonColors, label: "Season"},
    marks: [
      Plot.axisX({ticks: 4}),
      Plot.axisY({ticks: 2}),
      Plot.rectY(
        bookingsByMarketSegment,
        Plot.binX({y: "count"}, {x: "ADR", interval: 10, fill: "season", fy: "season", tip: true})
      ),
      Plot.text(
        bookingsByMarketSegment,
        Plot.groupZ(
          {text: (v) => `${v[0].season} (n = ${defaultFormat(v.length)})`},
          {
            fy: "season",
            frameAnchor: "top-right",
            dx: -6,
            dy: 6
          }
        )
      ),
      Plot.ruleX(meanRateBySeason, {x: "value", fy: "season", stroke: "currentColor"}),
      Plot.text(meanRateBySeason, {
        x: "value",
        fy: "season",
        text: (d) => `${d.season} mean rate: ${dollarFormat(d.value)}`,
        dx: 5,
        dy: -20,
        textAnchor: "start"
      }),
      Plot.frame({opacity: 0.4})
    ]
  });
}
```

```js
// Faceted bar charts of bookings by room type
function typeSeasonChart(width, height) {
  return Plot.plot({
    marginTop: 20,
    marginBottom: 30,
    marginLeft: 40,
    width,
    height: 270,
    x: {domain: seasonDomain, tickSize: 0, axis: null, label: "Season"},
    y: {label: "Count", fontSize: 0, grid: true, insetTop: 5},
    fx: {label: "Room type"},
    color: {legend: true, domain: seasonDomain, range: seasonColors, label: "Season"},
    marks: [
      Plot.text("ABCDEFGHLP", {fx: Plot.identity, text: null}),
      Plot.frame({opacity: 0.4}),
      Plot.barY(
        bookingsByMarketSegment,
        Plot.groupX(
          {y: "count"},
          {
            x: "season",
            fx: "ReservedRoomType",
            fill: "season",
            tip: true
          }
        )
      )
    ]
  });
}
```
