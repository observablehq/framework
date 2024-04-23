import "dotenv/config";
import {BetaAnalyticsDataClient} from "@google-analytics/data";

const {GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY} = process.env;

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: GA_CLIENT_EMAIL,
    private_key: GA_PRIVATE_KEY
  }
});

const defaultProperty = `properties/${GA_PROPERTY_ID}`;

const defaultDimensionFilter = {
  filter: {
    fieldName: "fullPageUrl",
    stringFilter: {
      value: "observablehq.com/plot",
      matchType: "BEGINS_WITH",
      caseSensitive: false
    }
  }
};

export async function runReport({
  property = defaultProperty,
  dimensionFilter = defaultDimensionFilter,
  ...options
} = {}) {
  const [response] = await analyticsClient.runReport({property, dimensionFilter, ...options});
  return response;
}
