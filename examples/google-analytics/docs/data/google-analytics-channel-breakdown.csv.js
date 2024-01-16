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
  dimensions: [{name: "firstUserDefaultChannelGroup"}, {name: "newVsReturning"}],
  metrics: [{name: "active28DayUsers"}],
  orderBys: [{dimension: {dimensionName: "firstUserDefaultChannelGroup"}}],
  dimensionFilter: {
    filter: {
      fieldName: "fullPageUrl",
      stringFilter: {
        value: "observablehq.com/plot/"
      }
    }
  }
});

const types = ["new", "returning"];
process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      channelGroup: d.dimensionValues[0].value,
      type: types.includes(d.dimensionValues[1].value) ? d.dimensionValues[1].value : "Unknown",
      active28d: d.metricValues[0].value
    }))
  )
);
