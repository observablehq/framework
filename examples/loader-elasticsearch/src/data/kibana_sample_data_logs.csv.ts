import { csvFormat } from "d3-dsv";
import { esClient } from "./es_client.js";

interface AggsResponseFormat {
  logs_histogram: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
      response_code: {
        buckets: Array<{ key: string; doc_count: number }>;
      };
    }>;
  };
}

interface LoaderOutputFormat {
  date: string;
  count: number;
  response_code: string;
}

const resp = await esClient.search<unknown, AggsResponseFormat>({
  index: "kibana_sample_data_logs",
  size: 0,
  aggs: {
    logs_histogram: {
      date_histogram: {
        field: "@timestamp",
        calendar_interval: "1d",
      },
      aggs: {
        response_code: {
          terms: {
            field: "response.keyword",
          },
        },
      },
    },
  },
});

if (!resp.aggregations) {
  throw new Error("aggregations not defined");
}

process.stdout.write(
  csvFormat(
    // This transforms the nested response from Elasticsearch into a flat array.
    resp.aggregations.logs_histogram.buckets.reduce<Array<LoaderOutputFormat>>(
      (p, c) => {
        p.push(
          ...c.response_code.buckets.map((d) => ({
            // Just keep the date from the full ISO string.
            date: c.key_as_string.split("T")[0],
            count: d.doc_count,
            response_code: d.key,
          })),
        );

        return p;
      },
      [],
    ),
  ),
);
