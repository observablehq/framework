# Import libraries (must be installed and available in environment)
import geopandas as gpd
import matplotlib.pyplot as plt
import io
import sys

# Read in data:
birth_statistics = gpd.read_file("docs/data-files/birth_statistics.geojson")

# Create a basic choropleth map
birth_statistics.plot(column="Birth_Rate", legend=True)
plt.axis("off")

# Save plot to a virtual file, then write binary PNG data to stdout
img_buffer = io.BytesIO()
plt.savefig(img_buffer, format="png")
img_buffer.seek(0)

sys.stdout.buffer.write(img_buffer.getvalue())
