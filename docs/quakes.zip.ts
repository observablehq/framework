import {csvFormat} from "d3-dsv";
import JSZip from "jszip";

// Fetch GeoJSON from the USGS.
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
const collection = await response.json();

// Convert to an array of objects.
const features = collection.features.map((f) => ({
  magnitude: f.properties.mag,
  longitude: f.geometry.coordinates[0],
  latitude: f.geometry.coordinates[1]
}));

// Output a ZIP archive to stdout.
const zip = new JSZip();
zip.file("metadata.json", JSON.stringify(collection.metadata, null, 2));
zip.file("features.csv", csvFormat(features));
zip.generateNodeStream().pipe(process.stdout);
