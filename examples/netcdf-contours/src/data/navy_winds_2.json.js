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
