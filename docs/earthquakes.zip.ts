import {csvFormat} from "d3-dsv";
import JSZip from "jszip";

// Load data from USGS.
const API_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const data = await fetch(API_URL).then((resp) => resp.json());

// Process data into the desired format.
const metadata = data.metadata;
const earthquakes = data.features.map(({properties, geometry: {coordinates}}) => ({
  lon: +coordinates[0].toFixed(2),
  lat: +coordinates[1].toFixed(2),
  magnitude: +properties.mag.toFixed(2)
}));

// Output a ZIP file to stdout.
const zip = new JSZip();
zip.file("metadata.json", JSON.stringify(metadata, null, 2));
zip.file("earthquakes.csv", csvFormat(earthquakes));
zip.generateNodeStream().pipe(process.stdout);
