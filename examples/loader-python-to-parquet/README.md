[Framework examples →](../)

# Python data loader to generate Apache Parquet

View live: <https://observablehq.observablehq.cloud/framework-example-loader-python-to-parquet/>

This Observable Framework example demonstrates how to write a Python data loader that outputs an Apache Parquet file using the [pyarrow](https://pypi.org/project/pyarrow/) library. The loader reads in a CSV with records for over 91,000 dams in the United States from the [National Inventory of Dams](https://nid.sec.usace.army.mil/), selects several columns, then writes the data frame as a parquet file to standard output. The data loader lives in [`src/data/us-dams.parquet.py`](./src/data/us-dams.parquet.py).
