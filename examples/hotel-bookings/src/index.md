---
toc: false
theme: wide
---

# Reservations by market segment

## Excludes complementary reservations

```js
import {hotelData} from "./components/hotelData.js";
import {donutChart} from "./components/donutChart.js";
import {bigNumber} from "./components/bigNumber.js";
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

<div class="grid grid-cols-4">
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byCountry, "Guest nationality", width, d3.quantize(t => d3.interpolateCool(t * 0.6 - 0.4), 6)))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byBookingOutcome, `Status`, width, ["#525252", "#8b8b8b"]))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(bookingSeason, "Visit season", width, ["#C79005", "#9c6b4e", "#708FC2", "#D9598A"]))}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(
  `Total bookings (${pickMarketSegment})`, `${d3.format(",")(bookingsByMarketSegment.length)}`, `${d3.format(".1%")(bookingsByMarketSegment.length / bookingsAll.length)} of all non-complementary bookings`)}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(
  `Average daily rate (${pickMarketSegment})`, `$ ${d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2)}`, `${d3.format("$")(d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2) - d3.mean(bookingsAll.map((d) => d.ADR)).toFixed(2))}`)}
  </div>
</div>

<div class="grid card" style="height: 250px">
    ${resize((width, height) => arrivalLineChart(width, height))}
</div>

<div class="grid grid-cols-2"">
  <div class="card grid-colspan-1">
    <h2>${pickMarketSegment}: rooms reserved by season</h2>
    <h3>Size indicates proportion of total bookings for either the selected segment (red) or all bookings (blue), by room type and season.</h3>
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
  ${display(Inputs.table(tableSearchValue))}
</div>

```js
const tableSearch = Inputs.search(cleanTable);

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
    subtitle: `Daily reservation counts (blue area) and 28-day moving average (solid line).`,
    marks: [
      () => htl.svg`<defs>
      <linearGradient id="gradient" gradientTransform="rotate(90)">
        <stop offset="60%" stop-color="#4269d0" stop-opacity="1" />
        <stop offset="100%" stop-color="#97bbf5" stop-opacity="0.3" />
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
              tip: true
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
// Daily rate stacked histogram
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
    fy: {label: null},
    color: {domain: ["Summer", "Fall", "Winter", "Spring"], range: ["#efB118", "#9c6b4e", "#97bbf5", "#ff8ab7"], label: "Season" },
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
    Plot.frame({opacity: 0.4}),
    ],
  });
}
```

**Data source:** Antonio et al (2021). Hotel booking demand datasets. Data in Brief (22): 41-49. https://doi.org/10.1016/j.dib.2018.11.126

```js
// Data wrangling for market segmented charts
const bookingsByMarketSegment = pickMarketSegment == "All" ? hotelData.filter(d => d.MarketSegment != "Complementary") : hotelData.filter(
  (d) =>
    d.MarketSegment == pickMarketSegment && d.MarketSegment != "Complementary"
);

const bookingsAll = hotelData.filter(d => d.MarketSegment != "Complementary");

const rateDiff = d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2) - d3.mean(bookingsAll.map((d) => d.ADR)).toFixed(2);

// By booking country
const bookingCountry = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.Country
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

const bookingCountryTopN = bookingCountry.slice(0, 5);

const bookingCountryOther = {
  name: "Other",
  value: d3.sum(
    bookingCountry.slice(5 - bookingCountry.length),
    (d) => d.value
  ),
};

const byCountry = bookingCountryTopN.concat(bookingCountryOther);

//Booking outcome (cancelled or not cancelled)
const byBookingOutcome = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.IsCanceled
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

// Bookings by Room Type Data
const byRoomType = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (d) => d.ReservedRoomType
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));

const seasonOrder = {Summer: 1, Fall: 2, Winter: 3, Spring: 4};

const bookingSeason = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.season
  )
  .map(([name, value]) => ({ name, value })), order = seasonOrder;
```

```js
const cleanTable = bookingsByMarketSegment.map(d => ({
   "Arrival date": d.arrivalDate,
   "Total nights": d.StaysInWeekNights + d.StaysInWeekendNights,
   "Average rate (USD)": d.ADR,
   "Room type": d.ReservedRoomType,
   "Market segment": d.MarketSegment,
   "Country": d.Country,
   "Adults": d.Adults,
   "Children": d.Children,
   "Lead time": d.LeadTime,
   "Cancellation": d.IsCanceled
}));
```

```js
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
      Plot.dot(bookingsAll, Plot.group({r: "proportion"}, {y: "season", x: "ReservedRoomType", fill: "#4269d0", opacity: 0.7})),
      Plot.dot(bookingsByMarketSegment, Plot.group({r: "proportion"}, {y: "season", x: "ReservedRoomType", fill: "#ff725c", opacity: 0.4})),
    ]
  });
}
```
