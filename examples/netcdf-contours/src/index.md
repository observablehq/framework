# From NetCDF to GeoJSON contours

Here’s a JavaScript data loader that uses [`netcdfjs`](https://github.com/cheminfo/netcdfjs) to read a NetCDF file, and then outputs GeoJSON contour polygons using [d3-geo-voronoi](https://github.com/Fil/d3-geo-voronoi).

```js run=false
import {readFile} from "node:fs/promises";
import {geoContour} from "d3-geo-voronoi";
import {NetCDFReader} from "netcdfjs";

// Read the NetCDF file (relative to this source file).
const data = await readFile(new URL("./navy_winds_2.nc", import.meta.url));

// Parse the NetCDF file.
const reader = new NetCDFReader(data);

// Extract the grid dimensions.
const n = reader.header.dimensions[0].size; // number of columns
const m = reader.header.dimensions[1].size; // number of rows

// Create a contour generator which expects a flat n×m grid of numbers.
const contour = geoContour()
  .x((_, i) => ((i % n) * 2 - n + 1) * 180 / n)
  .y((_, i) => (Math.floor(i / n) * 2 - m + 1) * 90 / m)
  .value((d) => d);

// Compute the contour polygons.
const polygons = contour(reader.getDataVariable("UWND"));

// Limit numeric precision to 2 decimal places.
function replacer(key, value) {
  return typeof value === "number" ? +value.toFixed(2) : value;
}

process.stdout.write(JSON.stringify(polygons, replacer));
```

The data is from [NOAA’s Pacific Marine Environmental Laboratory](https://ferret.pmel.noaa.gov/Ferret/documentation/users-guide/introduction/SAMPLE-DATA-SETS), by way of [Patrick Brockmann](https://github.com/PBrockmann/D3_netcdfjs), and represents global marine winds for the period 1982–1990.

The above data loader lives in `data/navy_winds_2.json.js`, so we can load the data as `data/navy_winds_2.json`. The `FileAttachment.json` method parses the file and returns a promise to an array of GeoJSON geometry objects.

```js echo
const winds = FileAttachment("data/navy_winds_2.json").json();
```

To make the map more legible, we’ll add land boundaries from [world-atlas](https://github.com/topojson/world-atlas). These are in TopoJSON format, so we’ll use `topojson.feature` to convert them to GeoJSON.

```js echo
const world = fetch(import.meta.resolve("npm:world-atlas/land-110m.json")).then((r) => r.json());
```

Lastly, we’ll use `Plot.geo` to render the wind data as filled contours. We’ll also add land boundaries, a graticule, and a sphere for context.

```js echo
Plot.plot({
  width,
  projection: "equal-earth",
  color: {type: "diverging", legend: true, label: "UWND"},
  marks: [
    Plot.geo(winds, {fill: "value"}),
    Plot.geo(topojson.feature(world, world.objects.land), {stroke: "black"}),
    Plot.graticule({stroke: "black"}),
    Plot.sphere({stroke: "black"})
  ]
})
```
