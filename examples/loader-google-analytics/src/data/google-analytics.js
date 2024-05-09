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

export async function runReport({property = defaultProperty, ...options} = {}) {
  const [response] = await analyticsClient.runReport({property, ...options});
  return response;
}
