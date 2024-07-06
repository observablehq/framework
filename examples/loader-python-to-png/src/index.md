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

To run this data loader, you’ll need python3 and the geopandas, matplotlib, io, and sys modules installed and available on your `$PATH`.

</div>

<div class="tip">

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

</div>

The above data loader lives in `data/birth-statistics.png.py`, so we can access the image using `data/birth-statistics.png`:

```html run=false
<img src="data/birth-statistics.png" style="max-width: 500px;">
```

<img src="data/birth-statistics.png" style="max-width: 500px;">
