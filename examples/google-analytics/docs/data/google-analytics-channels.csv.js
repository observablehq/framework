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
  dimensions: [{name: "date"}, {name: "firstUserDefaultChannelGroup"}],
  metrics: [{name: "active28DayUsers"}, {name: "bounceRate"}, {name: "engagementRate"}, {name: "totalUsers"}],
  orderBys: [{dimension: {dimensionName: "date"}}]
});

process.stdout.write(
  csvFormat(
    response.rows.map((d) => ({
      date: formatDate(d.dimensionValues[0].value),
      channelGroup: d.dimensionValues[1].value,
      active28d: d.metricValues[0].value,
      bounceRate: d.metricValues[1].value,
      engagementRate: d.metricValues[2].value,
      totalUsers: d.metricValues[3].value
    }))
  )
);

function formatDate(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}
