# JSZip

[JSZip](https://stuk.github.io/jszip/) is a JavaScript library for creating, reading and editing .zip archives.

JSZip is particularly useful in the context of Observable Markdown data loaders, when you want to create an [archive](../loaders#archives) with multiple files from a single data source.

For example, let’s create a data loader `quakes.zip.ts` with the following code in TypeScript, in four parts:

1. Import libraries
```
import {csvFormat} from "d3-dsv";
import JSZip from "jszip";
```

2. Load data
```
const API_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const data = await fetch(API_URL).then((resp) => resp.json());
```

3. Process data
```
const metadata = data.metadata;
const earthquakes = data.features.map(({properties, geometry: {coordinates}}) => ({
  lon: +coordinates[0].toFixed(2),
  lat: +coordinates[1].toFixed(2),
  magnitude: +properties.mag.toFixed(2)
}));
```

4. Output the files in the zip format
```
const zip = new JSZip();
zip.file("metadata.json", JSON.stringify(metadata, null, 2));
zip.file("earthquakes.csv", csvFormat(earthquakes));
zip.generateNodeStream().pipe(process.stdout);
```

Note how the last part serializes the _metadata_ and _earthquakes_ objects to a readable format corresponding to the extension of the corresponding file name.

You can then proceed to reference these files as attachments in a Markdown page:

```
const metadata = FileAttachment("quakes/metadata.json").json();
const earthquakes = FileAttachment("quakes/earthquakes.csv").csv({typed: true});
```

The zip file itself can be referenced as a whole (for example if the names of the files are not known in advance). It can then be read with [FileAttachment.zip](https://observablehq.com/documentation/data/files/file-attachments#zip-files), which uses JSZip under the hood:
```
const zip = FileAttachment("quakes.zip").zip();
```

For more, see the [official documentation](https://stuk.github.io/jszip/).