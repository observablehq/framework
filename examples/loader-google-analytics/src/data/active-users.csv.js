import {csvFormat} from "d3-dsv";
import {runReport} from "./google-analytics.js";

const {rows} = await runReport({
  dateRanges: [{startDate: "2023-06-01", endDate: "2023-09-01"}],
  dimensions: [{name: "date"}],
  metrics: [{name: "activeUsers"}],
  orderBys: [{dimension: {dimensionName: "date"}}]
});

process.stdout.write(
  csvFormat(
    rows.map((d) => ({
      date: parseDate(d.dimensionValues[0].value),
      value: d.metricValues[0].value
    }))
  )
);

function parseDate(date) {
  return new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`);
}
