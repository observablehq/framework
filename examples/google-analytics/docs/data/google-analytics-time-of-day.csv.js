import {csvFormat} from "d3-dsv";
import {runReport} from "./google-analytics.js";

const response = await runReport({
  dateRanges: [{startDate: "2023-04-01", endDate: "2023-12-31"}],
  dimensions: [{name: "hour"}, {name: "dayOfWeekName"}],
  metrics: [{name: "activeUsers"}, {name: "newUsers"}]
});

process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      hour: d.dimensionValues[0].value,
      dayOfWeek: d.dimensionValues[1].value,
      activeUsers: d.metricValues[0].value,
      newUsers: d.metricValues[1].value
    }))
  )
);
