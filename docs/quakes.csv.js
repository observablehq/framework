process.stdout.write("magnitude,longitude,latitude\n");
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
const collection = await response.json();
for (const feature of collection.features) {
  process.stdout.write(`${feature.properties.mag},${feature.geometry.coordinates.join(",")}\n`);
}
