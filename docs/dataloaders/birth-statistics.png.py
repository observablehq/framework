import geopandas as gpd 
import matplotlib.pyplot as plt 
import io
import sys

# Data: https://catalog.data.gov/dataset/birth-statistics-a76a6
birth_statistics = gpd.read_file('docs/dataloaders/birth_statistics.geojson')

birth_statistics.plot(column='Birth_Rate', legend=True)
plt.axis('off')

img_buffer = io.BytesIO()
plt.savefig(img_buffer, format='png')
img_buffer.seek(0)

sys.stdout.buffer.write(img_buffer.getvalue())