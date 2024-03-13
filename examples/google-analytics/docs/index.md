# Google analytics

```js
const summary = FileAttachment("data/google-analytics-summary.csv").csv({typed: true});
const hourly = FileAttachment("data/google-analytics-time-of-day.csv").csv({typed: true});
const channelBreakdown = FileAttachment("data/google-analytics-channel-breakdown.csv").csv({typed: true});
```

```js
import {trendNumber} from "./components/trendNumber.js";
import {lineChart} from "./components/lineChart.js";
import {marimekkoChart} from "./components/marimekkoChart.js";
import {punchcardChart} from "./components/punchcardChart.js";
```

```js
const color = Plot.scale({
  color: {
    domain: ["", "Organic Search", "Direct", "Referral", "Organic Social", "Unassigned"]
  }
});

const filteredChannelBreakdown = channelBreakdown
  .filter((d) => color.domain.includes(d.channelGroup) && d.type != "Unknown" && d.channelGroup !== "Unassigned")
  .sort((a, b) => color.domain.indexOf(b.channelGroup) - color.domain.indexOf(a.channelGroup));
```

<style type="text/css">

.crop {
  padding-bottom: 0;
  overflow: hidden;
}

</style>

```js
// Like Generators.input, but works with resize, and adds a default value.
function generateValue(target, defaultValue) {
  return Generators.observe((notify) => {
    const changed = ({target}) => notify(target.value ?? defaultValue);
    if (defaultValue !== undefined) notify(defaultValue);
    target.addEventListener("input", changed);
    return () => target.removeEventListener("input", changed);
  });
}

const activeUsersChart = resize((width) => lineChart(summary, {width, y: "active28d"}));
const engagementRateChart = resize((width) => lineChart(summary, {width, y: "engagementRate", percent: true}));
const wauPerMauChart = resize((width) => lineChart(summary, {width, y: "wauPerMau", percent: true}));
const engagedSessionsChart = resize((width) => lineChart(summary, {width, y: "engagedSessions"}));

const activeUsers = generateValue(activeUsersChart, summary[summary.length - 1]);
const engagementRate = generateValue(engagementRateChart, summary[summary.length - 1]);
const wauPerMau = generateValue(wauPerMauChart, summary[summary.length - 1]);
const engagedSessions = generateValue(engagedSessionsChart, summary[summary.length - 1]);
```

<div class="grid grid-cols-4">
  <div class="card crop">
    <h2>Rolling 28-day active users</h2>
    <span class="big">${activeUsers.active28d.toLocaleString("en-US")}</span>
    ${trendNumber(summary, {focus: activeUsers, value: "active28d"})}
    ${activeUsersChart}
  </div>
  <div class="card crop">
    <h2>Engagement rate</h2>
    <span class="big">${engagementRate.engagementRate.toLocaleString("en-US", {style: "percent"})}</span>
    ${trendNumber(summary, {focus: engagementRate, value: "engagementRate", format: {style: "percent"}})}
    ${engagementRateChart}
  </div>
  <div class="card crop">
    <h2>WAU/MAU ratio</h2>
    <span class="big">${wauPerMau.wauPerMau.toLocaleString("en-US", {style: "percent"})}</span>
    ${trendNumber(summary, {focus: wauPerMau, value: "wauPerMau", format: {style: "percent"}})}
    ${wauPerMauChart}
  </div>
  <div class="card crop">
    <h2>Engaged sessions</h2>
    <span class="big">${engagedSessions.engagedSessions.toLocaleString("en-US")}</span>
    ${trendNumber(summary, {focus: engagedSessions, value: "engagedSessions"})}
    ${engagedSessionsChart}
  </div>
</div>

<div class="grid grid-cols-2" style="grid-auto-rows: auto;">
  <div class="card grid-rowspan-4" style="max-width: none; display: flex; flex-direction: column;">
    <h2>Active users by channel</h2>
    <h3>Rolling 28-day active users</h3>
    <div style="flex-grow: 1;">${resize((width, height) => marimekkoChart(filteredChannelBreakdown, {width, height, x: "type", y: "channelGroup", value: "active28d", color}))}</div>
  </div>
  <div class="card grid-rowspan-2">
    <h2>Active users per day and hour of week</h2>
    ${resize((width) => punchcardChart(hourly, {width, label: "active users", value: "activeUsers"}))}
  </div>
  <div class="card grid-rowspan-2">
    <h2>New users per day and hour of week</h2>
    ${resize((width) => punchcardChart(hourly, {width, label: "new users", value: "newUsers"}))}
  </div>
</div>
