import {csvFormat} from "d3-dsv";
import {runReport} from "./google-analytics.js";

const response = await runReport({
  dateRanges: [{startDate: "2023-04-01", endDate: "2023-12-31"}],
  dimensions: [{name: "country"}],
  metrics: [{name: "engagementRate"}]
});

process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      country: d.dimensionValues[0].value,
      engagementRate: d.metricValues[0].value
    }))
  )
);
