# Import libraries
import requests
import pandas as pd
import json
import zipfile
import io

# Access earthquake data as JSON from URL:
url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
response = requests.get(url)
geojson_data = response.json()

# Get the metadata in JSON format:
earthquake_metadata = geojson_data['metadata']
earthquake_meta_json = json.dumps(earthquake_metadata)

# Create a pandas data frame with only earthquake magnitude, longitude, and latitude:
earthquakes = []

for i in geojson_data['features']:
    mag = i['properties']['mag']
    longitude = i['geometry']['coordinates'][0]
    latitude = i['geometry']['coordinates'][1]
    earthquakes.append({"mag": mag, "longitude": longitude, "latitude": latitude})

earthquakes_df = pd.DataFrame(earthquakes)

# Write the files to a zip archive
zip_bytes_io = io.BytesIO()

# Create the zip archive
with zipfile.ZipFile(zip_bytes_io, mode="w") as zipf:
    
    # Add JSON file to zip archive
    zipf.writestr("metadata.json", earthquake_meta_json)

    # Add DataFrame as a CSV file to zip archive
    csv_bytes_io = io.StringIO()
    earthquakes_df.to_csv(csv_bytes_io, index=False)
    zipf.writestr("quakes.csv", csv_bytes_io.getvalue())

# Zip archive to stdout
zip_bytes_io.seek(0)
print(zip_bytes_io.read())