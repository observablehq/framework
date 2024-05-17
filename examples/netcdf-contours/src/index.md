# From NetCDF to GeoJSON contours

This Observable Framework example demonstrates how to use the [`netcdfjs` library](https://github.com/cheminfo/netcdfjs) to read a NetCDF file within a JavaScript data loader, and then convert to GeoJSON using [d3-contour](https://github.com/d3/d3-contour). The resulting geometry is displayed using Observable Plot. The data is from [NOAA’s Pacific Marine Environmental Laboratory](https://ferret.pmel.noaa.gov/Ferret/documentation/users-guide/introduction/SAMPLE-DATA-SETS), by way of [Patrick Brockmann](https://github.com/PBrockmann/D3_netcdfjs), and represents global marine winds for the period 1982–1990.

Then let’s declare a `FileAttachment` for the NetCDF file and load it as an `ArrayBuffer` (since it’s binary). `FileAttachment.arrayBuffer` returns a `Promise`, which we chain with the `NetCDFReader` constructor.

```js echo
const winds = FileAttachment("navy_winds_2.json").json();
```

Then

```js echo
Plot.geo(winds).plot({width, projection: "equal-earth"})
```
