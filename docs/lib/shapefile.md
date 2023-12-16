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

To produce a map using [`Plot.geo`](https://observablehq.com/plot/marks/geo):

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
