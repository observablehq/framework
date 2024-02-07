import pandas as pd
import json
import zipfile
import os
import io
import sys

# OMG THIS WORKS

# Creating a Pandas DataFrame
data = {
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['New York', 'Los Angeles', 'Chicago']
}

df = pd.DataFrame(data)

# Converting DataFrame to CSV
# csv_filename = 'data.csv'
# df.to_csv(csv_filename, index=False)

# Converting DataFrame to JSON object
json_object = df.to_json(orient='records')

# Create a buffer
zip_buffer = io.BytesIO()

# Write JSON string to the zip file
with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
    zip_file.writestr('json-test.json', json_object)

# Write DataFrame to a CSV file in the zip file
with zipfile.ZipFile(zip_buffer, 'a') as zip_file:
    df_csv_string = df.to_csv(index=False)
    zip_file.writestr('csv-test.csv', df_csv_string)

# Flush the buffer and write the zip file to standard output
sys.stdout.buffer.write(zip_buffer.getvalue())
