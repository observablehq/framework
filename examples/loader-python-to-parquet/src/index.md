# Python data loader to generate an Apache Parquet file

Here’s a Python data loader that access records for over 91,000 dams from the [National Inventory of Dams](https://nid.sec.usace.army.mil/#/), limits the data to only four columns, then outputs an Apache Parquet file to standard out.

```python
# Load libraries (must be installed in environment)
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import sys

df = pd.read_csv("https://nid.sec.usace.army.mil/api/nation/csv", low_memory=False, skiprows=1).loc[:, ["Dam Name", "Primary Purpose", "Primary Dam Type", "Hazard Potential Classification"]]

# Write pandas DataFrame to a temporary object
buf = pa.BufferOutputStream()
table = pa.Table.from_pandas(df)
pq.write_table(table, buf)

# Get the buffer as a bytes object
buf_bytes = buf.getvalue().to_pybytes()

# Write the bytes to standard output
sys.stdout.buffer.write(buf_bytes)
```

To run this data loader, you’ll need python3, and the `pandas` and `pyarrow` libraries, installed and available in your environment. We recommend setting up a virtual environment, for example using:

- `$ python3 -m venv .venv`
- `$ source .venv/bin/activate`

</div>

The above data loader lives in `data/us-dams.parquet.py`, so we can load the data using `data/us-dams.parquet`. The `FileAttachment.parquet` method parses the file and returns a promise to an Apache Arrow table.

```js echo
const dams = FileAttachment("./data/us-dams.parquet").parquet();
```

We can display the table using `Inputs.table`.

```js echo
Inputs.table(dams)
```

Lastly, we can pass the table to `Plot.plot` to make a simple bar chart of dam counts by purpose, with color mapped to hazard classification.

```js echo
Plot.plot({
  marginLeft: 220,
  color: {legend: true, domain: ["Undetermined", "Low", "Significant", "High"]},
  marks: [
    Plot.barX(dams,
      Plot.groupY({x: "count"}, {y: "Primary Purpose", fill: "Hazard Potential Classification", sort: {y: "x", reverse: true}
      })
    )
  ]
})
```
