import {readFile} from "node:fs/promises";
import {geoContour} from "d3-geo-voronoi";
import {NetCDFReader} from "netcdfjs";

const data = await readFile(new URL("./navy_winds_2.nc", import.meta.url));
const reader = new NetCDFReader(data);
const isize = reader.header.dimensions[0].size;
const jsize = reader.header.dimensions[1].size;
const contour = geoContour().x((_, i) => (i % isize) / isize * 360 - 179.5).y((_, i) => Math.floor(i/isize) / jsize * 180 - 89.5).value(d => d);
const polygons = contour(reader.getDataVariable("UWND"));
process.stdout.write(JSON.stringify(polygons).replaceAll(/([.]\d\d)\d+/g, "$1"));
