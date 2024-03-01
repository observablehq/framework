# Shapefile

The [ESRI shapefile](http://www.esri.com/library/whitepapers/pdfs/shapefile.pdf) is a binary format for geometry. Shapefiles are often paired with [dBASE table files](http://www.digitalpreservation.gov/formats/fdd/fdd000326.shtml) for metadata. You can use the [shapefile](https://github.com/mbostock/shapefile) module to convert shapefiles to GeoJSON for use with libraries such as [D3](./d3), [Observable Plot](./plot), and [Leaflet](./leaflet). To import the shapefile module:

```js echo
import * as shapefile from "npm:shapefile";
```

Then, to read a `.shp` and `.dbf` file:

```js echo
const collection = shapefile.read(
  ...(await Promise.all([
    FileAttachment("ne_110m_land/ne_110m_land.shp").stream(),
    FileAttachment("ne_110m_land/ne_110m_land.dbf").stream()
  ]))
);
```

(You can omit the `.dbf` file if you only need the geometry.)

The resulting `collection` is a [promise](../javascript/promises) to a GeoJSON `FeatureCollection`:

```js echo
collection
```

To produce a map using [Plot’s geo mark](https://observablehq.com/plot/marks/geo):

```js echo
Plot.plot({
  projection: {
    type: "orthographic",
    rotate: [110, -30],
  },
  marks: [
    Plot.sphere(),
    Plot.graticule(),
    Plot.geo(collection, {fill: "currentColor"})
  ]
})
```

Or, streaming to a canvas:

<figure style="max-width: 100%;">
  <canvas id="map-canvas" width="960" height="491"></canvas>
</figure>

```js echo
const canvas = document.querySelector("#map-canvas");
const context = canvas.getContext("2d");
context.fillStyle = getComputedStyle(canvas).color;
context.clearRect(0, 0, canvas.width, canvas.height);

const path = d3.geoPath(d3.geoEquirectangular(), context);
const source = await shapefile.open(
  ...(await Promise.all([
    FileAttachment("ne_110m_land/ne_110m_land.shp").stream(),
    FileAttachment("ne_110m_land/ne_110m_land.dbf").stream()
  ]))
);

while (true) {
  const {done, value} = await source.read();
  if (done) break;
  context.beginPath();
  path(value);
  context.fill();
}
```
