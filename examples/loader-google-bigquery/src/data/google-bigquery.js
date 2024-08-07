import "dotenv/config";
import {BigQuery} from "@google-cloud/bigquery";

const {BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY} = process.env;

if (!BQ_PROJECT_ID) throw new Error("missing BQ_PROJECT_ID");
if (!BQ_CLIENT_EMAIL) throw new Error("missing BQ_CLIENT_EMAIL");
if (!BQ_PRIVATE_KEY) throw new Error("missing BQ_PRIVATE_KEY");

const bigQueryClient = new BigQuery({
  projectId: BQ_PROJECT_ID,
  credentials: {
    client_email: BQ_CLIENT_EMAIL,
    private_key: BQ_PRIVATE_KEY.replace(/\\n/g, '\n')
  }
});

export async function runQuery(query) {
  const [rows] = await bigQueryClient.query({ query });
  return rows;
}
