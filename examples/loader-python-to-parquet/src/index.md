# Python data loader to generate Apache Parquet

Here’s a Python data loader that accesses records for over 91,000 dams from the [National Inventory of Dams](https://nid.sec.usace.army.mil/), limits the data to only four columns, then outputs an Apache Parquet file to standard out.

```python
# Load libraries (must be installed in environment)
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import sys

df = pd.read_csv("https://nid.sec.usace.army.mil/api/nation/csv", low_memory=False, skiprows=1).loc[:, ["Dam Name", "Primary Purpose", "Primary Dam Type", "Hazard Potential Classification"]]

# Write DataFrame to a temporary file-like object
buf = pa.BufferOutputStream()
table = pa.Table.from_pandas(df)
pq.write_table(table, buf, compression="snappy")

# Get the buffer as a bytes object
buf_bytes = buf.getvalue().to_pybytes()

# Write the bytes to standard output
sys.stdout.buffer.write(buf_bytes)
```

<div class="note">

To run this data loader you’ll need python3, and the `pandas` and `pyarrow` libraries installed and available on your `$PATH`.

</div>

<div class="tip">

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

</div>

This example uses the default Snappy compression algorithm. See other [options for compression](https://parquet.apache.org/docs/file-format/data-pages/compression/) available in pyarrow’s [`write_table()`](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html) function.

The above data loader lives in `data/us-dams.parquet.py`, so we can load the data using `data/us-dams.parquet`. The `FileAttachment.parquet` method parses the file and returns a promise to an Apache Arrow table.

```js echo
const dams = FileAttachment("data/us-dams.parquet").parquet();
```

We can display the table using `Inputs.table`.

```js echo
Inputs.table(dams)
```

Lastly, we can pass the table to Observable Plot to make a simple bar chart of dam counts by purpose, with color mapped to hazard classification.

```js echo
  Plot.plot({
    marginLeft: 220,
    color: {legend: true, domain: ["Undetermined", "Low", "Significant", "High"]},
    marks: [
      Plot.barX(dams,
        Plot.groupY(
          {x: "count"},
          {
            y: "Primary Purpose",
            fill: "Hazard Potential Classification",
            sort: {y: "x", reverse: true}
          }
        )
      )
    ]
  })
```
