---
sql:
  trips: nyc-taxi.parquet
---

# Mosaic

[Mosaic](https://uwdata.github.io/mosaic/) is a system for linking data visualizations, tables, and input widgets, all leveraging a database (DuckDB) for scalable processing. With Mosaic, you can interactively visualize and explore millions —and even billions— of data points.

The example below shows 1 million taxi rides pickup and dropoff points in New York City on Jan 1–3, 2010. The dataset is stored in a 8MB [Apache Parquet](./arrow#apache-parquet) file, generated with a data loader.

${maps}

${histogram}

The map views for pickups and dropoffs are coordinated. You can also select an interval in the histogram to filter the maps. _What spatial patterns can you find?_

---

The code below creates an instance of Mosaic and the three coordinated views. (Please upvote [#1011](https://github.com/observablehq/framework/issues/1011) if you would like better support for Mosaic.)

```js echo
// Create a shared filter
const $filter = vg.Selection.crossfilter();

// Create the maps
const defaultAttributes = [
  vg.width(335),
  vg.height(550),
  vg.margin(0),
  vg.xAxis(null),
  vg.yAxis(null),
  vg.xDomain([297000, 297000 + 28.36 * 335]),
  vg.yDomain([57900, 57900 + 28.36 * 550]), // ensure aspect ratio of 1
  vg.colorScale("symlog")
];

const maps = vg.hconcat(
  vg.plot(
    vg.raster(vg.from("trips", {filterBy: $filter}), {x: "px", y: "py", imageRendering: "pixelated"}),
    vg.intervalXY({as: $filter}),
    vg.text([{label: "Taxi Pickups"}], {
      dx: 10,
      dy: 10,
      text: "label",
      fill: "black",
      fontSize: "1.2em",
      frameAnchor: "top-left"
    }),
    ...defaultAttributes,
    vg.colorScheme("blues")
  ),
  vg.hspace(10),
  vg.plot(
    vg.raster(vg.from("trips", {filterBy: $filter}), {x: "dx", y: "dy", imageRendering: "pixelated"}),
    vg.intervalXY({as: $filter}),
    vg.text([{label: "Taxi Dropoffs"}], {
      dx: 10,
      dy: 10,
      text: "label",
      fill: "black",
      fontSize: "1.2em",
      frameAnchor: "top-left"
    }),
    ...defaultAttributes,
    vg.colorScheme("oranges")
  )
);

// Create the histogram
const histogram = vg.plot(
  vg.rectY(vg.from("trips"), {x: vg.bin("time"), y: vg.count(), fill: "steelblue", inset: 0.5}),
  vg.intervalX({as: $filter}),
  vg.yTickFormat("s"),
  vg.xLabel("Pickup Hour"),
  vg.yLabel("Number of Rides"),
  vg.width(680),
  vg.height(100)
);
```

For more Mosaic examples, see the [Mosaic + Framework](https://uwdata.github.io/mosaic-framework-example/) website.
