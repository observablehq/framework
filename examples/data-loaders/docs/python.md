# Python data loaders

Observable Framework supports [data loaders](https://observablehq.com/framework/loaders) written in Python by passing them to the [python3](https://www.python.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below reads in the penguins data from a local file, performs [logistic regression](https://en.wikipedia.org/wiki/Logistic_regression), then outputs a single CSV with the original penguin data enriched with species classifications.

Create a file in your project source root with the .csv.py double extension (for example, `docs/data/my-data.csv.py`), then paste the Python code below to get started.

<!-- TODO update with setup information, see: https://github.com/observablehq/framework/tree/main/examples/penguin-classification#reuse-this-example>-->

```js
showCode(FileAttachment("data/penguin-logistic.csv.py"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const penguinClassification = FileAttachment("data/penguin-logistic.csv").csv({typed: true});
```

<p class="tip">The file attachment name does not include the <tt>.py</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now display the dataset with the predictions:

```js echo
Inputs.table(penguinClassification)
```

<!-- End local testing of penguin-logistic.csv.py -->

## PNG

The data loader below (`birth-statistics.png.py`) accesses [birth data for Lake County, Illinois](https://data-lakecountyil.opendata.arcgis.com/datasets/lakecountyil::birth-statistics/explore) from a local geoJSON file. A simple choropleth of birth rates is created using `matplotlib`, then output as a PNG file.

Create a file in your project source root with the .png.py double extension (for example, `docs/data/my-png.png.py`), then paste the Python code below to get started.

```python
# Import libraries (must be installed)
import geopandas as gpd
import matplotlib.pyplot as plt
import io
import sys

# Read in data
birth_statistics = gpd.read_file('docs/data-files/birth_statistics.geojson')

# Create a basic choropleth map
birth_statistics.plot(column='Birth_Rate', legend=True)
plt.axis('off')

# Save plot to a virtual file, then write binary PNG data to stdout
img_buffer = io.BytesIO()
plt.savefig(img_buffer, format='png')
img_buffer.seek(0)

sys.stdout.buffer.write(img_buffer.getvalue())
```

Access the output of the data loader (here, `data/birth-statistics.png`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const birthRateMap = FileAttachment("data/birth-statistics.png").image();
```

```js echo
birthRateMap
```

`birth-statistics.png` [routes](../loaders#routing) to the `birth-statistics.png.py` data loader and reads its standard output stream.

## Zip

The data loader below `earthquakes.zip.py` accesses data on [earthquakes from the USGS](https://www.usgs.gov/programs/earthquake-hazards/earthquakes), then combines metadata (as JSON) and selected earthquake magnitude and location (as a CSV) in a zip archive.

Create a file in your project source root with the .zip.py double extension (for example, `docs/data/my-data.zip.py`), then paste the Python code below to get started.

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

# Create a buffer
zip_buffer = io.BytesIO()

# Write JSON string to the zip file
with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
    zip_file.writestr('quakes_metadata.json', earthquake_meta_json)

# Write DataFrame to a CSV file in the zip file
with zipfile.ZipFile(zip_buffer, 'a') as zip_file:
    df_csv_string = earthquakes_df.to_csv(index=False)
    zip_file.writestr('quakes.csv', df_csv_string)

# Write the zip file to standard output
sys.stdout.buffer.write(zip_buffer.getvalue())
```

Access the output of the data loader (here, `quakes_metadata.json` and `quakes.csv`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const quakeMetadata = FileAttachment("data/earthquakes/quakes_metadata.json").json()
```

```js echo
const quakeData = FileAttachment("data/earthquakes/quakes.csv").csv({typed: true})
```

```js echo
quakeData
```

You can alternatively access the zip archive as a whole:

```js echo
const quakeZip = FileAttachment("data/earthquakes.zip").zip()
```

```js echo
quakeZip
```

```js
import {showCode} from "./components/showCode.js";
```
