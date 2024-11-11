# Download the ZIP archive from the Census Bureau (if needed).
if [ ! -f src/.observablehq/cache/cb_2023_06_cousub_500k.zip ]; then
  curl -f -o src/.observablehq/cache/cb_2023_06_cousub_500k.zip 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_06_cousub_500k.zip'
fi

# Unzip the ZIP archive to extract the shapefile.
unzip -oqd src/.observablehq/cache src/.observablehq/cache/cb_2023_06_cousub_500k.zip

# Convert the shapefile to TopoJSON, simplify, and merge counties.
shp2json --encoding utf-8 -n src/.observablehq/cache/cb_2023_06_cousub_500k.shp > src/.observablehq/cache/cb_2023_06_cousub_500k.ndjson

geo2topo -q 1e5 -n counties=src/.observablehq/cache/cb_2023_06_cousub_500k.ndjson \
  | toposimplify -f -s 1e-7 \
  | topomerge state=counties
