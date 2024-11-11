import "dotenv/config";
import {BetaAnalyticsDataClient} from "@google-analytics/data";

const {GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY} = process.env;

if (!GA_CLIENT_EMAIL) throw new Error("missing GA_CLIENT_EMAIL");
if (!GA_PRIVATE_KEY) throw new Error("missing GA_PRIVATE_KEY");

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: GA_CLIENT_EMAIL,
    private_key: GA_PRIVATE_KEY
  }
});

const defaultProperty = GA_PROPERTY_ID && `properties/${GA_PROPERTY_ID}`;

export async function runReport({property = defaultProperty, ...options} = {}) {
  const [response] = await analyticsClient.runReport({property, ...options});
  return response;
}
