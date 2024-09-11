[Framework examples →](../)

# DuckDB data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-duckdb/>

This Observable Framework example demonstrates how to write a data loader as a shell script that downloads a CSV file, then uses the DuckDB CLI to filter and reshape this data, finally outputting the result as Apache Parquet. The example data is statistics about the education of modern foreign languages from Eurostat, the data portal of the statistical office of the European Union.

The data loader lives in [`src/educ_uoe_lang01.parquet.sh`](./src/educ_uoe_lang01.parquet.sh).
