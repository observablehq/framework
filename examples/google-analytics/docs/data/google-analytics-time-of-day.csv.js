import "dotenv/config";
import {BetaAnalyticsDataClient} from "@google-analytics/data";
import {csvFormat} from "d3-dsv";

const {GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY} = process.env;

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: GA_CLIENT_EMAIL,
    private_key: GA_PRIVATE_KEY
  }
});

const [response] = await analyticsDataClient.runReport({
  property: `properties/${GA_PROPERTY_ID}`,
  dateRanges: [{startDate: "2023-04-01", endDate: "2023-12-31"}],
  dimensions: [{name: "hour"}, {name: "dayOfWeekName"}],
  metrics: [{name: "activeUsers"}],
  dimensionFilter: {
    filter: {
      fieldName: "fullPageUrl",
      stringFilter: {
        value: "observablehq.com/plot/"
      }
    }
  }
});

process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      hour: d.dimensionValues[0].value,
      dayOfWeek: d.dimensionValues[1].value,
      activeUsers: d.metricValues[0].value
    }))
  )
);
