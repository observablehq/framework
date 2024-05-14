---
toc: false
---

# Reservations by market segment

```js
import {hotelData} from "./components/hotelData.js";
import {donutChart} from "./components/donutChart.js";
import {bigNumber} from "./components/bigNumber.js";
```

## ${pickMarketSegment == "Groups" ? "Group" : pickMarketSegment} reservations

```js
// Radio button input to choose market segment
const pickMarketSegment = view(
  Inputs.radio(
    hotelData
      .filter((d) => d.MarketSegment != "Complementary")
      .map((d) => d.MarketSegment),
    {
      label: "Choose booking type:",
      value: "Online travel agent",
      unique: true,
    }
  )
);
```

<div class="grid grid-cols-4">
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byCountry, "Country", width, d3[`scheme${"Pastel1"}`]))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(byBookingOutcome, "Cancellations", width, ["gray", "gainsboro"]))}
  </div>
  <div class="card grid-rowspan-2">
    ${resize(width => donutChart(bookingSeason, "Season", width, d3[`scheme${"Set2"}`]))}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(
  `${d3.format(",")(bookingsByMarketSegment.length)}`,
  `Total bookings`,
  "#ccc"
)}
  </div>
  <div class="card grid-rowspan-1">
    ${bigNumber(
  `$ ${d3.mean(bookingsByMarketSegment.map((d) => d.ADR)).toFixed(2)}`,
  `Average daily rate`,
  `#ccc`
)}
  </div>
  <div class="card grid-colspan-4 grid-rowspan-2">
    ${resize((width, height) => arrivalLineChart(width, height))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-2">
  <h2>Rooms reserved by season</h2>
    ${resize((width, height) => typeSeasonBubble(width, height))}
  </div>
  <div class="card grid-colspan-2 grid-rowspan-2">
    ${resize((width, height) => dailyRateChart(width, height))}
  </div>
</div>

<div class="card" style="padding: 0">
${display(Inputs.table(cleanTable))}
</div>

```js
// Line chart (arrival dates)
function arrivalLineChart(width, height) {
  return Plot.plot({
    height: height - 50,
    marginBottom: 35,
    width,
    x: { label: "Arrival date" },
    y: { label: "Bookings", grid: true },
    title: `${pickMarketSegment} bookings by arrival date`,
    caption: "Daily counts and 28-day moving average.",
    marks: [
      Plot.lineY(
        bookingsByMarketSegment,
        Plot.binX(
          { y: "count" },
          {
            x: "arrivalDate",
            interval: d3.utcDay,
            opacity: 0.5,
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
// Booking lead time bar chart
function leadTimeChart(width, height) {
  return Plot.plot({
    width,
    height: height - 30,
    x: { label: "Booking lead time (days)" },
    y: { grid: true },
    color: { legend: true },
    marks: [
      Plot.ruleY([0]),
      Plot.axisX({ ticks: 5 }),
      Plot.axisY({ ticks: 5 }),
      Plot.rectY(
        bookingsByMarketSegment,
        Plot.binX(
          { y: "count" },
          { x: "LeadTime", interval: 20, fill: "season" }
        )
      ),
    ],
  });
}
```

```js
// Daily rate stacked histogram
function dailyRateChart(width, height) {
  return Plot.plot({
    width,
    height: height - 30,
    x: { label: "Daily rate" },
    y: { grid: true },
    color: { legend: true },
    marks: [
      Plot.ruleY([0]),
      Plot.axisX({ ticks: 5 }),
      Plot.axisY({ ticks: 5 }),
      Plot.rectY(
        bookingsByMarketSegment,
        Plot.binX(
          { y: "count" },
          { x: "ADR", fill: "#21C6A8", interval: 20, fill: "season", tip: true}
        )
      ),
    ],
  });
}
```

**Data source:** Antonio et al (2021). Hotel booking demand datasets. Data in Brief (22): 41-49. https://doi.org/10.1016/j.dib.2018.11.126

**Credit:** Donut charts reuse code from [Mike Bostock's _Donut chart_ notebook](https://observablehq.com/@d3/donut-chart/2). Big number boxes are adapted from [Paul Buffa’s _Walmart growth dashboard_](https://observablehq.com/d/a156c1245672f9bd).

```js
// Data wrangling for market segmented charts
const bookingsByMarketSegment = hotelData.filter(
  (d) =>
    d.MarketSegment == pickMarketSegment && d.MarketSegment != "Complementary"
);

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

const bookingSeason = d3
  .flatRollup(
    bookingsByMarketSegment,
    (d) => d.length,
    (v) => v.season
  )
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => d3.descending(a.value, b.value));
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
    height: height - 20,
    x: {label: "Room type reserved", grid: true},
    y: {label: null, grid: true},
    r: {range: [1, 25]},
    color: {scheme: "Reds"},
    marks: [
      Plot.dot(bookingsByMarketSegment, Plot.group({r: "count", fill: "count"}, {y: "season", x: "ReservedRoomType", tip: true, stroke: "currentColor", strokeWidth: 0.5}))
    ]
  });
}
```
