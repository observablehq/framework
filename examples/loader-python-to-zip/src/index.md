# Python data loader to generate ZIP

This Python data loader accesses data on [earthquakes from the USGS](https://www.usgs.gov/programs/earthquake-hazards/earthquakes), then combines metadata (as JSON) and selected earthquake magnitude and location (as a CSV) in a ZIP archive.

```python
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
    zip_file.writestr("quakes-metadata.json", earthquake_meta_json)

# Write DataFrame to a CSV file in the zip file
with zipfile.ZipFile(zip_buffer, "a") as zip_file:
    df_csv_string = earthquakes_df.to_csv(index=False)
    zip_file.writestr("quakes.csv", df_csv_string)

# Write the zip file to standard output
sys.stdout.buffer.write(zip_buffer.getvalue())
```

<div class="note">

To run this data loader, you’ll need python3, and the requests and pandas modules, installed and available on your `$PATH`. (json, zipfile, io, and sys are part of the python3 standard library.)

</div>

<div class="tip">

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

</div>

The above data loader lives in `data/earthquakes.zip.py`. You can load the entire ZIP archive in a markdown page using `FileAttachment`:

```js echo
const earthquakes = FileAttachment("data/earthquakes.zip").zip();
```

Or access individual files (`quakes-metadata.json` and `quakes.csv`) directly:

```js echo
const quakesMetadata = FileAttachment("data/earthquakes/quakes-metadata.json").json();
```

```js echo
const quakes = FileAttachment("data/earthquakes/quakes.csv").csv({typed: true});
```

Take a quick look at the quakes data using `Inputs.table`:

```js echo
Inputs.table(quakes)
```

Then explore the distribution of earthquake magnitudes using Observable Plot:

```js echo
Plot.rectY(quakes, Plot.binX({y: "count"}, {x: "mag"})).plot()
```
