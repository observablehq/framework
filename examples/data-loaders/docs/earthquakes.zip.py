# Import libraries (must be installed)
import requests
import pandas as pd
import json
import zipfile
import io
import sys

# Access earthquake data as JSON from URL:
url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
response = requests.get(url)
geojson_data = response.json()

# Get quakes metadata in JSON format:
earthquake_metadata = geojson_data["metadata"]
earthquake_meta_json = json.dumps(earthquake_metadata)

# Create a pandas data frame with only earthquake magnitude, longitude, and latitude:
earthquakes = []

for i in geojson_data["features"]:
    mag = i["properties"]["mag"]
    longitude = i["geometry"]["coordinates"][0]
    latitude = i["geometry"]["coordinates"][1]
    earthquakes.append({"mag": mag, "longitude": longitude, "latitude": latitude})

earthquakes_df = pd.DataFrame(earthquakes)

# Create a buffer
zip_buffer = io.BytesIO()

# Write JSON string to the zip file
with zipfile.ZipFile(zip_buffer, "w") as zip_file:
    zip_file.writestr("quakes_metadata.json", earthquake_meta_json)

# Write DataFrame to a CSV file in the zip file
with zipfile.ZipFile(zip_buffer, "a") as zip_file:
    df_csv_string = earthquakes_df.to_csv(index=False)
    zip_file.writestr("quakes.csv", df_csv_string)

# Write the zip file to standard output
sys.stdout.buffer.write(zip_buffer.getvalue())
