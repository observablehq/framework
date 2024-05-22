# GeoTIFF

This example demonstrates how to read a GeoTIFF file using [geotiff.js](https://geotiffjs.github.io/) and then visualize it with Observable Plot’s [raster mark](https://observablehq.com/plot/marks/raster). The data represents global surface temperatures (from an unknown source, by way of [Roger Veciana](https://gist.github.com/rveciana/de0bd586eafd7fcdfe29227ccbdcd511)).

To start, let’s import `fromArrayBuffer` from geotiff.js:

```js echo
import {fromArrayBuffer} from "npm:geotiff";
```

Then we’ll declare a `FileAttachment` for the GeoTIFF file and load it as an `ArrayBuffer` (since it’s binary). `FileAttachment.arrayBuffer` returns a `Promise`, which we chain with the `fromArrayBuffer` constructor.

```js echo
const sfctmp = FileAttachment("sfctmp.tiff").arrayBuffer().then(fromArrayBuffer);
```

Now `sfctmp` is a promise to a `GeoTIFF`. (Promises are implicitly awaited across code blocks, so we don’t need to explicitly `await` below.) This object allows us to read the contents and metadata of the parsed GeoTIFF file.

```js echo
const image = await sfctmp.getImage();
const [values] = await image.readRasters();
```

Now let’s visualize surface temperature using a raster plot. Since the values are represented as a one-dimensional array of numbers, we can use them as the raster mark’s data; but we also need to specify the `width` and `height` of the grid.

```js echo
Plot.plot({
  width,
  aspectRatio: 1, // preserve the aspect ratio of the data
  color: {label: "SFCTMP", legend: true},
  y: {reverse: true},
  marks: [
    Plot.raster(values, {width: image.getWidth(), height: image.getHeight()})
  ]
})
```

(I’m not sure what the temperature units are here… it might be degrees Fahrenheit?)

We can use [Plot’s projection system](https://observablehq.com/plot/features/projections) to apply a suitable global projection. Below we use the Equal Earth projection, an equal-area projection preserving the relative size of areas. The `x1`, `y1`, `x2`, and `y2` options specify the bounds of the grid in geographic coordinates, while the `clip` option clips the data to the globe.

```js echo
Plot.plot({
  width,
  projection: "equal-earth",
  color: {label: "SFCTMP", legend: true},
  marks: [
    Plot.raster(values, {
      width: image.getWidth(),
      height: image.getHeight(),
      x1: 0,
      y1: 90,
      x2: 360,
      y2: -90,
      interpolate: "barycentric",
      clip: "sphere"
    }),
    Plot.graticule({stroke: "black"})
  ]
})
```
