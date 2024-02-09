# Python data loaders

The Observable CLI supports [data loaders](../loaders) written in Python, by passing them to the [python3](https://www.python.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below (`penguin-logistic.csv.py`) reads in the penguins data from a local file, performs [logistic regression](https://en.wikipedia.org/wiki/Logistic_regression), then outputs a single CSV with penguin species classifications.

Copy and paste the code below into your own Python data loader (with extension .csv.py in your project source root, typically `docs`), then update with your own data and Python code to get started.

```python
# Import libraries (must be installed)
import pandas as pd
from sklearn.linear_model import LogisticRegression
import sys

# Data access, wrangling and analysis
df = pd.read_csv("docs/data/penguins.csv")

X = df.iloc[:, [2, 3, 4, 5]]
Y = df.iloc[:, 0]

logreg = LogisticRegression()
logreg.fit(X, Y)

results = df.copy()
results['speciecs_predicted'] = logreg.predict(X)

# Write pandas data frame to CSV, and to standard output
results.to_csv(sys.stdout)
```

Access the output of the data loader (here, `penguin-logistic.csv`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const penguinClassification = FileAttachment("penguin-logistic.csv").csv({typed: true});
```
`penguin-logistic.csv` [routes](../loaders#routing) to the `penguin-logistic.csv.py` data loader and reads its standard output stream.

<!-- For local testing of penguin-logistic.csv.py only -->

```js echo run
const predictions = FileAttachment("penguin-logistic.csv").csv({typed: true});
```

```js echo run
predictions
```

<!-- End local testing of penguin-logistic.csv.py -->

## PNG

The data loader below (`birth-statistics.png.py`) accesses [birth data for Lake County, Illinois](https://data-lakecountyil.opendata.arcgis.com/datasets/lakecountyil::birth-statistics/explore) from a local geoJSON file. A simple choropleth of birth rates is created using `matplotlib`, then output as a PNG file.

Copy and paste the code below into your own Python data loader (with extension .png.py in your project source root, typically `docs`), then update with your own data and Python code to get started.

```python
# Import libraries (must be installed)
import geopandas as gpd 
import matplotlib.pyplot as plt 
import io
import sys

# Read in data
birth_statistics = gpd.read_file('docs/data/birth_statistics.geojson')

# Create a basic choropleth map
birth_statistics.plot(column='Birth_Rate', legend=True)
plt.axis('off')

# Save plot to a virtual file, then write binary PNG data to stdout
img_buffer = io.BytesIO()
plt.savefig(img_buffer, format='png')
img_buffer.seek(0)

sys.stdout.buffer.write(img_buffer.getvalue())
```

Access the output of the data loader (here, `birth-statistics.png`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const birthRateMap = FileAttachment("birth-statistics.png").image();
```

```js echo
birthRateMap
```

`birth-statistics.png` [routes](../loaders#routing) to the `birth-statistics.png.py` data loader and reads its standard output stream.

## Zip

The data loader below `earthquakes.zip.py` accesses data on [earthquakes from the USGS](https://www.usgs.gov/programs/earthquake-hazards/earthquakes), then combines metadata (as JSON) and selected earthquake magnitude and location (as a CSV) in a zip archive. 

Copy and paste the code below into your own Python data loader (with extension .zip.py in your project source root, typically `docs`), then update with your own data and Python code to get started.

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
const quakeMetadata = FileAttachment("earthquakes/quakes_metadata.json").json()
```

```js echo
const quakeData = FileAttachment("earthquakes/quakes.csv").csv({typed: true})
```

```js echo
quakeData
```

You can alternatively access the zip archive as a whole: 

```js echo
const quakeZip = FileAttachment("earthquakes.zip").zip()
```

```js echo
quakeZip
```