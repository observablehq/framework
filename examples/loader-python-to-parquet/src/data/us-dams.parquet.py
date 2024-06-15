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
