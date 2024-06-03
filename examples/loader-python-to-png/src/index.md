# Python data loader to generate PNG

Here’s a Python data loader that accesses [birth data for Lake County, Illinois](https://data-lakecountyil.opendata.arcgis.com/datasets/lakecountyil::birth-statistics/explore) from a local geoJSON file, creates a choropleth map using matplotlib, then returns the map as PNG to standard out.

```python
# Import libraries (must be installed and available in environment)
import geopandas as gpd
import matplotlib.pyplot as plt
import io
import sys

# Read in data:
birth_statistics = gpd.read_file("src/data/birth_statistics.geojson")

# Create a basic choropleth map
birth_statistics.plot(column="Birth_Rate", legend=True)
plt.axis("off")

# Save plot to a virtual file, then write binary PNG data to stdout
img_buffer = io.BytesIO()
plt.savefig(img_buffer, format="png")
img_buffer.seek(0)

sys.stdout.buffer.write(img_buffer.getvalue())
```

<div class="note">

To run this data loader, you’ll need python3 and the geopandas, matplotlib, io, and sys modules installed and available on your `$PATH`. We recommend setting up a virtual environment, _e.g._ with:

- `$ python3 -m venv .venv`
- `$ source .venv/bin/activate`

Then install the required modules:

- `$ pip install -r requirements.txt`

</div>

The above data loader lives in `data/birth-statistics.png.py`, so we can load the data using `data/birth-statistics.png`. Access the PNG in a markdown page using FileAttachment:

```js echo
const birthRateMap = FileAttachment("data/birth-statistics.png").image();
```

```js echo
birthRateMap
```
