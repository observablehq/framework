[Framework examples →](../)

# Elasticsearch data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-elasticsearch/>

This Observable Framework example demonstrates how to write a TypeScript data loader that runs a query on Elasticsearch using the [Elasticsearch Node.js client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html). The data loader lives in [`src/data/kibana_sample_data_logs.csv.ts`](./src/data/kibana_sample_data_logs.csv.ts) and uses the helper [`src/data/es_client.ts`](./src/data/es_client.ts).

To fully reproduce the example, you need to have a setup with both Elasticsearch and Kibana running to create the sample data. Here’s how to set up both on macOS:

```bash
# Download and run Elasticsearch
curl -O https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.14.1-darwin-x86_64.tar.gz
gunzip -c elasticsearch-8.14.1-darwin-x86_64.tar.gz | tar xopf -
cd elasticsearch-8.14.1
./bin/elasticsearch

# Next, in another terminal tab, download and run Kibana
curl -O https://artifacts.elastic.co/downloads/kibana/kibana-8.14.1-darwin-x86_64.tar.gz
gunzip -c kibana-8.14.1-darwin-x86_64.tar.gz | tar xopf -
cd kibana-8.14.1
./bin/kibana
```

The commands for both will output instructions how to finish the setup with security enabled. Once you have both running, you can create the “Sample web logs” dataset in Kibana via this URL: http://localhost:5601/app/home#/tutorial_directory/sampleData

Finally, create the `.env` file with the credentials shared for the user `elastic` that were logged when starting Elasticsearch like this. To get the CA fingerprint for the config, run the following command from the directory you started installing Elasticsearch:

```
openssl x509 -fingerprint -sha256 -noout -in ./elasticsearch-8.14.1/config/certs/http_ca.crt
```

```
ES_NODE="https://elastic:<PASSWORD>@localhost:9200"
ES_CA_FINGERPRINT="<CA_FINGERPRINT>"
ES_UNSAFE_TLS_REJECT_UNAUTHORIZED="FALSE"
```
