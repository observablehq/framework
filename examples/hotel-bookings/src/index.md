---
toc: false
theme: [ocean-floor, wide]
---

# Hotel reservations by market segment

## Excludes complementary reservations

```js
import {donutChart} from "./components/donutChart.js";
import {bigNumber} from "./components/bigNumber.js";

const hotelData = FileAttachment("data/hotelData.csv").csv({typed: true})
```

```js
// Radio button input to choose market segment
const pickMarketSegmentInput =
  Inputs.radio(
    ["All"].concat(hotelData
      .filter((d) => d.MarketSegment != "Complementary")
      .map((d) => d.MarketSegment)),
    {
      label: "Booking type:",
      value: "All",
      unique: true
    }
  )
;

const pickMarketSegment = Generators.input(pickMarketSegmentInput);
```

${pickMarketSegmentInput}

## ${pickMarketSegment} bookings

<div class="grid grid-cols-4">
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byCountry, "Guest nationality", width, d3.quantize(t => d3.interpolateTurbo(t * 0.2 + 0.02), 6)))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byBookingOutcome, `Status`, width, ["#525252", "#8b8b8b"]))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(bookingSeason, "Visit season", width, seasonColors))}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(`Total bookings`, datesExtent, `${d3.format(",")(bookingsByMarketSegment.length)}`, `${d3.format(".1%")(bookingsByMarketSegment.length / bookingsAll.length)} of all bookings`)}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(`Average daily rate`, datesExtent, `$ ${d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2)}`, `${d3.format("$")(Math.abs(rateDiffFromAverage))} ${rateDiffFromAverage > 0 ? `greater than overal average rate` : `less than overall average rate`}`)}
  </div>
</div>

<div class="grid card" style="height: 250px">
    ${resize((width, height) => arrivalLineChart(width, height))}
</div>

<div class="grid grid-cols-2"">
  <div class="card grid-colspan-1">
    <h2>${pickMarketSegment}: rooms reserved by season</h2>
    <h3>${pickMarketSegment == "All" ? `Size represents total bookings by room type and season.` : `Size represents number of total bookings, by room type and season, for the selected market segment (red), with all bookings shown for comparison in blue.`}</h3>
    ${resize((width) => typeSeasonBubble(width))}
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
  ${display(Inputs.table(tableSearchValue, {columns: ["arrivalDate", "ADR", "Arrival date", "ReservedRoomType", "MarketSegment", "Country", "Adults","Children", "LeadTime", "IsCanceled"], header: {arrivalDate: "Arrival date", ADR: "Average rate", ReservedRoomType: "Room type", MarketSegment: "Booking type", Country: "Guest country", Adults: "Adults", Children: "Children", LeadTime: "Lead time", IsCanceled: "Status"}}))}
</div>

**Data source:** Antonio et al (2021). Hotel booking demand datasets. Data in Brief (22): 41-49. https://doi.org/10.1016/j.dib.2018.11.126

```js
// Filtered data for selected market segment
const bookingsByMarketSegment = pickMarketSegment == "All" ? hotelData.filter(d => d.MarketSegment != "Complementary") : hotelData.filter(
  (d) =>
    d.MarketSegment == pickMarketSegment && d.MarketSegment != "Complementary"
);

// All bookings data (except complementary)
const bookingsAll = hotelData.filter(d => d.MarketSegment != "Complementary");

// Bookings by nationality
const bookingCountry = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.Country
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

// Limit to top 5
const bookingCountryTopN = bookingCountry.slice(0, 5);

// Bin the rest as "Other"
const bookingCountryOther = {
  name: "Other",
  value: d3.sum(
    bookingCountry.slice(5 - bookingCountry.length),
    (d) => d.value
  ),
};

// Combine top 5 countries and "other" for donut chart
const byCountry = bookingCountryTopN.concat(bookingCountryOther);

//Booking status (cancelled or not cancelled)
const byBookingOutcome = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.IsCanceled
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

// Bookings by room type
const byRoomType = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.ReservedRoomType
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

// Bookings by season
const seasonOrder = {Summer: 1, Fall: 2, Winter: 3, Spring: 4};

const bookingSeason = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.season
  )
  .map(([name, value]) => ({ name, value })), order = seasonOrder;

// Find & format arrival date extent for big number
const arrivalDates = d3.extent(bookingsAll, d => d.arrivalDate)

const datesExtent = [d3.timeFormat("%b %d, %Y")(new Date(arrivalDates[0])), d3.timeFormat("%b %d, %Y")(new Date(arrivalDates[1]))] ;

// Calculate rate difference from total average for big number
const rateDiffFromAverage = d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2) - d3.mean(bookingsAll.map((d) => d.ADR)).toFixed(2);
```

```js
// Create search input (for searchable table)
const tableSearch = Inputs.search(bookingsAll);

const tableSearchValue = Generators.input(tableSearch);
```

```js
// Line chart (arrival dates)
function arrivalLineChart(width, height) {
  return Plot.plot({
    height: height - 50,
    marginBottom: 35,
    width,
    x: { label: "Arrival date"},
    y: { label: "Bookings", grid: true },
    title: `${pickMarketSegment} bookings by arrival date`,
    subtitle: `Daily reservation counts (gray area) and 28-day moving average (solid line).`,
    marks: [
      () => htl.svg`<defs>
      <linearGradient id="gradient" gradientTransform="rotate(90)">
        <stop offset="60%" stop-color="#B5B5B5" stop-opacity="1" />
        <stop offset="100%" stop-color="#B5B5B5" stop-opacity="0.1" />
      </linearGradient>
      </defs>`,
      Plot.areaY(
        bookingsByMarketSegment,
        Plot.binX(
          { y: "count" },
          {
            x: "arrivalDate",
            interval: d3.utcDay,
            fill: "url(#gradient)",
            strokeWidth: 1
          }
        )
      ),
      Plot.lineY(
        bookingsByMarketSegment,
        Plot.windowY(
          { k: 28 },
          Plot.binX(
            { y: "count" },
            {
              x: "arrivalDate",
              interval: d3.utcDay,
              strokeWidth: 2,
              tip: true,
            }
          )
        )
      ),
      Plot.ruleY([0]),
      Plot.axisX({ ticks: 5 }),
      Plot.axisY({ ticks: 5 })
    ],
  });
}
```

```js
//Create faceted histograms of daily rate

// Season color scheme
const seasonColors = ["#959C00", "#9C5A00", "#465C9C", "#109F73"];

// Calculate mean daily rate by season (for rule mark)
const meanRateBySeason = d3.flatRollup(bookingsByMarketSegment, v => d3.mean(v, d => d.ADR), d => d.season).map(([season, value]) => ({season, value}));


// Build daily rate faceted histograms
function dailyRateChart(width, height) {
  return Plot.plot({
    width,
    height: height - 20,
    marginLeft: 30,
    marginRight: 0,
    marginTop: 10,
    marginBottom: 30,
    x: { label: "Average rate($)", grid: true},
    y: {nice: true, label: null},
    axis: null,
    fy: {label: null, domain: ["Summer", "Fall", "Winter", "Spring"]},
    color: {domain: ["Summer", "Fall", "Winter", "Spring"], range: seasonColors, label: "Season" },
    marks: [
      Plot.axisX({ ticks: 4 }),
      Plot.axisY({ ticks: 2}),
      Plot.rectY(
        bookingsByMarketSegment,
        Plot.binX(
          { y: "count" },
          { x: "ADR", fill: "#21C6A8", interval: 10, fill: "season", fy: "season"}
        )
      ),
      Plot.text(
      bookingsByMarketSegment,
      Plot.groupZ(
        { text: (v) => `${v[0].season} (n = ${d3.format(",")(v.length)})` },
        {
          fy: "season",
          frameAnchor: "top-right",
          dx: -6,
          dy: 9
        }
      )
    ),
    Plot.ruleX(meanRateBySeason, {x: "value", fy: "season", stroke: "currentColor"}),
    Plot.text(meanRateBySeason, {x: "value", fy: "season", text: d => `${d.season} mean rate: ${d3.format("$.2f")(d.value)}`, dx: 5, dy: -20, textAnchor: "start"}),
    Plot.frame({opacity: 0.4}),
    ],
  });
}
```

```js
// Create bubble chart of bookings by room type and season
function typeSeasonBubble(width, height) {
  return Plot.plot({
    marginTop: 0,
    marginBottom: 35,
    marginLeft: 50,
    width,
    height: 250,
    x: {label: "Room type reserved", grid: true},
    y: {label: null, grid: true},
    r: {range: [1, 20]},
    marks: [
      Plot.dot(bookingsAll, Plot.group({r: "count"}, {y: "season", x: "ReservedRoomType", fill: "#4269d0", opacity: 0.9})),
      pickMarketSegment == "All" ? null : Plot.dot(bookingsByMarketSegment, Plot.group({r: "count"}, {y: "season", x: "ReservedRoomType", fill: "#ff725c", opacity: 0.9})),
    ]
  });
}
```
