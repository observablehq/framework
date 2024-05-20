[Framework examples →](../)

# DuckDB data loader

View live: <https://observablehq.observablehq.cloud/framework-example-loader-duckdb/>

This Observable Framework example demonstrates how to write a data loader as a bash script that downloads a CSV file from Eurostat (the data portal from the statistical office of the European Union), then calls DuckDB to filter and reshape this data, saving the result as Apache Parquet. The example illustrates the technique by fetching statistics about education to modern foreign languages across Europe.

The data loader lives in [`src/educ_uoe_lang01.parquet.sh`](./src/educ_uoe_lang01.parquet.sh).
