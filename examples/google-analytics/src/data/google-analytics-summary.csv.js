import {csvFormat} from "d3-dsv";
import {runReport} from "./google-analytics.js";

const response = await runReport({
  dateRanges: [{startDate: "2023-04-01", endDate: "2023-12-31"}],
  dimensions: [{name: "date"}],
  metrics: [{name: "active28DayUsers"}, {name: "engagementRate"}, {name: "wauPerMau"}, {name: "engagedSessions"}],
  orderBys: [{dimension: {dimensionName: "date"}}]
});

process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      date: formatDate(d.dimensionValues[0].value),
      active28d: d.metricValues[0].value,
      engagementRate: d.metricValues[1].value,
      wauPerMau: d.metricValues[2].value,
      engagedSessions: d.metricValues[3].value
    }))
  )
);

function formatDate(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}
