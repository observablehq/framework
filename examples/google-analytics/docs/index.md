---
theme: dashboard
---

```js
const summary = FileAttachment("data/google-analytics-summary.csv").csv({typed: true});
const hourly = FileAttachment("data/google-analytics-time-of-day.csv").csv({typed: true});
const channels = FileAttachment("data/google-analytics-channels.csv").csv({typed: true});
const channelBreakdown = FileAttachment("data/google-analytics-channel-breakdown.csv").csv({typed: true});
const countries = FileAttachment("data/google-analytics-country.csv").csv({typed: true});
const world = FileAttachment("data/countries-110m.json").json();
```

```js
// Imports
import {svg} from "npm:htl";
import {Marimekko} from "./components/marimekko.js";
```

```js
// Helpers
const date = d3.utcFormat("%m/%d/%Y");
const color = Plot.scale({
  color: {
    domain: ["", "Organic Search", "Direct", "Referral", "Organic Social", "Unassigned"]
  }
});
const bands = 5;
const opacityScale = d3.scaleLinear().domain([0, bands]).range([0.15, 0.85]);

const filteredChannelBreakdown = channelBreakdown
  .filter((d) => color.domain.includes(d.channelGroup) && d.type != "Unknown" && d.channelGroup !== 'Unassigned')
  .sort((a, b) => color.domain.indexOf(b.channelGroup) - color.domain.indexOf(a.channelGroup));

const countryLookup = d3.rollup(
  countries,
  (v) => v[0].engagementRate,
  (d) => (d.country === "United States" ? "United States of America" : d.country)
);

const countryShapes = topojson.feature(world, world.objects.countries);
const countryData = countryShapes.features.map((d) => ({...d, value: countryLookup.get(d.properties.name)}));

function getCompareValue(data, metric) {
  const maxDate = data[data.length - 1].date;
  const compareDate = d3.utcDay.offset(maxDate, -1);
  const match =  data.find(d => date(d.date) === date(compareDate))[metric];
  return data[data.length - 1][metric] - match;
}
```

```js
// Charts
function lineChart(data, {width, height, metric}) {
  return Plot.plot({
    width,
    height: 97,
    axis: null,
    insetTop: 10,
    insetLeft: -15,
    insetRight: -16.5,
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(data, {
        x: "date",
        y: metric,
        tip: true,
      })
    ]
  });
}

function areaChart(data, {width, height, metric}) {
  return Plot.plot({
    width,
    height: 97,
    axis: null,
    insetTop: 10,
    insetLeft: -15,
    insetRight: -16.5,
    marks: [
      Plot.ruleY([0]),
      Plot.areaY(data, {
        x: "date",
        y: metric,
        fillOpacity: 0.25
      }),
      Plot.lineY(data, {
        x: "date",
        y: metric,
        tip: true
      })
    ]
  });
}

function marrimekoChart(data, {width, height, xDim, yDim, metric, title, caption, color}) {
  const xy = (options) => Marimekko({...options, x: xDim, y: yDim, value: metric});
  return Plot.plot({
    width,
    height: height - 30,
    subtitle: title,
    caption,
    label: null,
    x: {percent: true, ticks: 10, tickFormat: (d) => (d === 100 ? `100%` : d)},
    y: {percent: true, ticks: 10, tickFormat: (d) => (d === 100 ? `100%` : d)},
    color,
    marks: [
      Plot.text(
        data,
        xy({
          text: (d) => d[metric].toLocaleString("en"),
          fontSize: 14,
          fontWeight: 600,
          stroke: yDim,
          fill: "var(--theme-background)"
        })
      ),
      Plot.rect(data, xy({fill: yDim, fillOpacity: 1})),
      Plot.frame({fill: "var(--theme-background)", fillOpacity: 0.2}),
      Plot.text(
        data,
        xy({
          text: yDim,
          fontSize: 11,
          dy: -16,
          fill: "var(--theme-background)"
        })
      ),
      Plot.text(
        data,
        xy({
          text: (d) => d[metric].toLocaleString("en"),
          fontSize: 14,
          fontWeight: 600,
          fill: "var(--theme-background)"
        })
      ),
      Plot.text(
        data,
        Plot.selectMaxY(
          xy({
            z: xDim,
            text: (d) => `${d[xDim].slice(0, 1).toUpperCase()}${d[xDim].slice(1)}`,
            anchor: "top",
            lineAnchor: "bottom",
            fontSize: 12,
            dy: -6
          })
        )
      )
    ]
  });
}

function horizonChart(data, {width, height, metric, title, caption, format, z, color, order}) {
  const step = d3.max(data, (d) => d[metric]) / bands;
  return Plot.plot({
    width,
    height: height - 40,
    subtitle: title,
    caption,
    axis: null,
    marginTop: 20,
    color,
    y: {domain: [0, step]},
    x: {axis: true},
    fy: {axis: null, domain: order, padding: 0.05},
    facet: {data, y: z},
    marks: [
      d3.range(bands).map((i) =>
        Plot.areaY(data, {
          x: "date",
          y: (d) => d[metric] - i * step,
          fill: z,
          fillOpacity: opacityScale(i),
          clip: true
        })
      ),
      Plot.tip(data, Plot.pointerX({x: "date", channels: {users: metric}, format: {fy: false}})),
      Plot.text(
        data,
        Plot.selectFirst({
          text: z,
          fontSize: 12,
          frameAnchor: "top-left",
          dx: 6,
          dy: 6,
          stroke: "var(--theme-background)",
          paintOrder: "stroke",
          fill: "currentColor"
        })
      )
    ]
  });
}

function Punchcard(data, {width, height, label}) {
  const aggregatedValues = d3
    .rollups(data, (v) => d3.median(v, (d) => d.activeUsers), (d) => d.hour, (d) => d.dayOfWeek)
    .flatMap((d) => d[1].map((d) => d[1]));

  return Plot.plot({
    caption: `${label.slice(0, 1).toUpperCase()}${label.slice(1)} per day and hour of week`,
    width,
    height: height - 10,
    inset: 12,
    padding: 0,
    marginBottom: 10,
    grid: true,
    round: false,
    label: null,
    x: {
      axis: "top",
      domain: d3.range(24),
      interval: 1,
      tickFormat: (d) => (d % 12 || 12) + (d === 0 ? " AM" : d === 12 ? " PM" : "")
    },
    y: {
      domain: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      tickFormat: (d) => d.substr(0, 3)
    },
    r: {label, range: [1, 20], domain: d3.extent(aggregatedValues)},
    marks: [
      Plot.dot(
        data,
        Plot.group(
          {r: "median"},
          {
            y: "dayOfWeek",
            x: "hour",
            r: "activeUsers",
            fill: "currentColor",
            stroke: "var(--theme-background)",
            sort: null,
            tip: true
          }
        )
      )
    ]
  });
}

function worldMap(data, {width, height, title, caption}) {
  return Plot.plot({
    width,
    height: height - 60,
    caption,
    projection: "equal-earth",
    color: {
      scheme: "cool",
      legend: true,
      label: "Engagement rate",
      tickFormat: "%"
    },
    marks: [
      Plot.graticule(),
      Plot.geo(data, {
        fill: "var(--theme-foreground-fainter)",
        stroke: "var(--theme-foreground)",
        strokeWidth: 0.25
      }),
      Plot.geo(data, {
        fill: "value",
        stroke: "var(--theme-foreground)",
        strokeWidth: 0.5
      }),
      Plot.sphere()
    ]
  });
}
```

```js
function trend(value, format) {
  return html`<span class="${value > 0 ? "green" : value < 0 ? "red" : "muted"}">${d3.format(format)(value)} ${value > 0 ? "↗︎" : value < 0 ? "↘︎" : ""}`;
}
```

# Google analytics

_Summary of metrics from the [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries), pulled on ${date(d3.max(summary, d => d.date))}_

<div class="grid grid-cols-4" style="grid-auto-rows: 168px;">
  <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Rolling 28-day Active users</h2>
    <span class="big">${summary[summary.length-1].active28d.toLocaleString("en-US")}</span>
    ${trend(getCompareValue(summary, 'active28d'), "+,")}
    ${resize((width) => areaChart(summary, {width, metric: 'active28d'}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Engagement Rate</h2>
    <span class="big">${d3.format(".0%")(summary[summary.length-1].engagementRate)}</span>
    ${trend(getCompareValue(summary, 'engagementRate'), "+.2%")}
    ${resize((width) => lineChart(summary, {width, metric: 'engagementRate'}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>WAU to MAU ratio</h2>
    <span class="big">${d3.format(".0%")(summary[summary.length-1].wauPerMau)}</span>
    ${trend(getCompareValue(summary, 'wauPerMau'), "+.2%")}
    ${resize((width) => lineChart(summary, {width, metric: 'wauPerMau'}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-1">
    <h2>Engaged Sessions</h2>
    <span class="big">${d3.format(",")(summary[summary.length-1].engagedSessions.toLocaleString("en-US"))}</span>
    ${trend(getCompareValue(summary, 'engagedSessions'), "+,")}
    ${resize((width) => areaChart(summary, {width, metric: 'engagedSessions'}))}
  </div>
</div>

<div class="grid grid-cols-2" style="grid-auto-rows: 140px;">
  <div class="card grid-colspan-1 grid-rowspan-4">
    ${resize((width, height) => horizonChart(channels, {width, height, metric:'active28d', title: 'Active users by channel', caption: 'Rolling 28-day active users', format: 's', z: 'channelGroup', color, order: color.domain.slice(1)}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-3">
    ${resize((width, height) => worldMap(countryData, {width, height, title: "Active users by country", caption: 'Current rolling 28-day active users by country', lookup: countryLookup}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-3">
    ${resize((width, height) => marrimekoChart(filteredChannelBreakdown, {width, height, metric:'active28d', title: 'New vs. returning users by channel', caption: 'Rolling 28-day active users by channel and split by new vs. returning', format: '%', yDim: 'channelGroup', xDim: 'type', color}))}
  </div>
  <div class="card grid-colspan-1 grid-rowspan-2">
    ${resize((width, height) => Punchcard(hourly, {width, height, label: "active users"}))}
  </div>
</div>
