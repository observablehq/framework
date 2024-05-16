# NetCDF

This example demonstrates how to read a NetCDF file using [`netcdfjs`](https://github.com/cheminfo/netcdfjs) and then visualize it with Observable Plot’s [raster mark](https://observablehq.com/plot/marks/raster). The data is from [NOAA’s Pacific Marine Environmental Laboratory](https://ferret.pmel.noaa.gov/Ferret/documentation/users-guide/introduction/SAMPLE-DATA-SETS), by way of [Patrick Brockmann](https://github.com/PBrockmann/D3_netcdfjs), and represents global marine winds for the period 1982–1990.

To start, let’s import `NetCDFReader` from `netcdfjs`:

```js echo
import {NetCDFReader} from "npm:netcdfjs";
```

Then let’s declare a `FileAttachment` for the NetCDF file and load it as an `ArrayBuffer` (since it’s binary). `FileAttachment.arrayBuffer` returns a `Promise`, which we chain with the `NetCDFReader` constructor.

```js echo
const winds = FileAttachment("navy_winds_2.nc").arrayBuffer().then((data) => new NetCDFReader(data));
```

Now `winds` is a promise to a `NetCDFReader`. (Promises are implicitly awaited across code blocks, so we don’t need to explicitly `await` below.)

We can inspect the metadata of the NetCDF file via the `header` property. The `header.dimensions` tells us the grid resolution, while the `header.variables` tells us what values are stored in the grid. `UWND` is the [zonal](https://en.wikipedia.org/wiki/Zonal_and_meridional_flow) component of the wind, while `VWND` is its meridional component.

```js echo
winds.header
```

Now let’s visualize the zonal wind component using a raster plot. The values are represented as a one-dimensional array of numbers, which we can use as the raster mark’s data; but we also need to specify the `width` and `height` of the grid. Since values can be both <span style="border-bottom: solid 2px #a51b2c">negative</span> (westward wind) and <span style="border-bottom: solid 2px #1e5f9d">positive</span> (eastward), we can use the `rdbu` diverging color scheme.

```js echo
Plot.plot({
  color: {
    label: "UWND",
    legend: true,
    scheme: "rdbu"
  },
  marks: [
    Plot.raster(winds.getDataVariable("UWND"), {
      width: winds.header.dimensions[0].size,
      height: winds.header.dimensions[1].size
    })
  ]
})
```

We can use [Plot’s projection system](https://observablehq.com/plot/features/projections) to apply a suitable global projection. Below we use the Equal Earth projection, an equal-area projection preserving the relative size of areas. The `x1`, `y1`, `x2`, and `y2` options specify the bounds of the grid in geographic coordinates, while the `clip` option clips the data to the globe.

```js echo
Plot.plot({
  projection: "equal-earth",
  color: {
    label: "UWND",
    legend: true,
    scheme: "rdbu"
  },
  marks: [
    Plot.raster(winds.getDataVariable("UWND"), {
      width: winds.header.dimensions[0].size,
      height: winds.header.dimensions[1].size,
      x1: -180,
      y1: -90,
      x2: 180,
      y2: 90,
      interpolate: "barycentric",
      clip: "sphere"
    }),
    Plot.graticule({stroke: "black"})
  ]
})
```
