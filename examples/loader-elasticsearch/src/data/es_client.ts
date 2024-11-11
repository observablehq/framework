import "dotenv/config";
import { Client } from "@elastic/elasticsearch";

// Have a look at the "Getting started" guide of the Elasticsearch node.js client
// to learn more about how to configure these environment variables:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html

const {
  // ES_NODE can include the username and password in the URL, e.g.:
  // ES_NODE=https://<USERNAME>:<PASSWORD>@<HOST>:9200
  ES_NODE,
  // As an alternative to ES_NODE when using Elastic Cloud, you can use ES_CLOUD_ID and
  // set it to the Cloud ID that you can find in the cloud console of the deployment (https://cloud.elastic.co/).
  ES_CLOUD_ID,
  // ES_API_KEY can be used instead of username and password.
  // The API key will take precedence if both are set.
  ES_API_KEY,
  ES_USERNAME,
  ES_PASSWORD,
  // the fingerprint (SHA256) of the CA certificate that is used to sign
  // the certificate that the Elasticsearch node presents for TLS.
  ES_CA_FINGERPRINT,
  // Warning: This option should be considered an insecure workaround for local development only.
  // You may wish to specify a self-signed certificate rather than disabling certificate verification.
  // ES_UNSAFE_TLS_REJECT_UNAUTHORIZED can be set to FALSE to disable certificate verification.
  // See https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html#auth-tls for more.
  ES_UNSAFE_TLS_REJECT_UNAUTHORIZED,
} = process.env;

if ((!ES_NODE && !ES_CLOUD_ID) || (ES_NODE && ES_CLOUD_ID))
  throw new Error(
    "Either ES_NODE or ES_CLOUD_ID need to be defined, but not both.",
  );

const esUrl = ES_NODE ? new URL(ES_NODE) : undefined;
const isHTTPS = esUrl?.protocol === "https:";
const isLocalhost = esUrl?.hostname === "localhost";

export const esClient = new Client({
  ...(ES_NODE ? { node: ES_NODE } : {}),
  ...(ES_CLOUD_ID ? { cloud: { id: ES_CLOUD_ID } } : {}),
  ...(ES_CA_FINGERPRINT ? { caFingerprint: ES_CA_FINGERPRINT } : {}),
  ...(ES_API_KEY
    ? {
      auth: {
        apiKey: ES_API_KEY,
      },
    }
    : {}),
  ...(!ES_API_KEY && ES_USERNAME && ES_PASSWORD
    ? {
      auth: {
        username: ES_USERNAME,
        password: ES_PASSWORD,
      },
    }
    : {}),
  ...(isHTTPS &&
    isLocalhost &&
    ES_UNSAFE_TLS_REJECT_UNAUTHORIZED?.toLowerCase() === "false"
    ? {
      tls: {
        rejectUnauthorized: false,
      },
    }
    : {}),
});
