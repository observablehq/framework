# JSZip

[JSZip](https://stuk.github.io/jszip/) is a JavaScript library for creating, reading and editing [ZIP archives](<https://en.wikipedia.org/wiki/ZIP_(file_format)>). JSZip is particularly useful in the context of [data loaders](../loaders) to create multiple files from a single data source as an [archive](../loaders#archives).

For example, here is a TypeScript data loader `earthquakes.zip.ts`:

```js run=false
import {csvFormat} from "d3-dsv";
import JSZip from "jszip";

// Load data from USGS.
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
const {metadata, features} = await response.json();

// Process data into the desired format, retaining only the desired columns.
const earthquakes = features.map(({properties, geometry: {coordinates}}) => ({
  lon: +coordinates[0].toFixed(2),
  lat: +coordinates[1].toFixed(2),
  magnitude: +properties.mag.toFixed(2)
}));

// Output a ZIP file to stdout.
const zip = new JSZip();
zip.file("metadata.json", JSON.stringify(metadata, null, 2));
zip.file("earthquakes.csv", csvFormat(earthquakes));
zip.generateNodeStream().pipe(process.stdout);
```

Note how the last part serializes the `metadata` and `earthquakes` objects to a readable format corresponding to the file extension (`.json` and `.csv`).

To load data in the browser, use [`FileAttachment`](../javascript/files):

```js run=false
const metadata = FileAttachment("earthquakes/metadata.json").json();
const earthquakes = FileAttachment("earthquakes/earthquakes.csv").csv({typed: true});
```

The ZIP file itself can be also referenced as a whole — for example if the names of the files are not known in advance — with [`FileAttachment.zip`](../javascript/files#zip):

```js echo
const zip = FileAttachment("earthquakes.zip").zip();
const metadata = zip.then((zip) => zip.file("metadata.json").json());
```

`FileAttachment.zip` uses JSZip under the hood.
