[Framework examples →](../)

# Elasticsearch data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-elasticsearch/>

This Observable Framework example demonstrates how to write a TypeScript data loader that runs a query on Elasticsearch using the [Elasticsearch Node.js client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html). The data loader lives in [`src/data/kibana_sample_data_logs.csv.ts`](./src/data/kibana_sample_data_logs.csv.ts) and uses the helper [`src/data/es_client.ts`](./src/data/es_client.ts).

To fully reproduce the example, you need to have a setup with both Elasticsearch and Kibana running to create the sample data. The dataset can be created from the UI via this URL: https://<KIBANA_HOST>:<KIBANA_PORT>/app/home#/tutorial_directory/sampleData
