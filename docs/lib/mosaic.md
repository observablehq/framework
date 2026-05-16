---
sql:
  trips: nyc-taxi.parquet
---

# Mosaic vgplot <a href="https://github.com/observablehq/framework/releases/tag/v1.3.0" class="observablehq-version-badge" data-version="^1.3.0" title="Added in 1.3.0"></a>

[Mosaic](https://uwdata.github.io/mosaic/) is a system for linking data visualizations, tables, and inputs, leveraging [DuckDB](./duckdb) for scalable processing. Mosaic includes an interactive grammar of graphics, [Mosaic vgplot](https://uwdata.github.io/mosaic/vgplot/), built on [Observable Plot](./plot). With vgplot, you can interactively visualize and explore millions — even billions — of data points.

The example below shows the pickup and dropoff locations of one million taxi rides in New York City from Jan 1–3, 2010. The dataset is stored in a 8MB [Apache Parquet](./arrow#apache-parquet) file, generated with a [data loader](../data-loaders).

${maps}

${histogram}

The views above are coordinated: brushing a time window in the histogram, or a region in either map, will filter both maps. _What spatial patterns can you find?_

Mosaic vgplot is available by default in Markdown as `vg` and is backed by the default DuckDB client that is configured using [SQL front matter](../sql). If you would prefer to initialize Mosaic yourself, you can do something like:

```js run=false
import {DuckDBClient} from "npm:@observablehq/duckdb";
import * as vgplot from "npm:@uwdata/vgplot";

const db = await DuckDBClient.of({trips: FileAttachment("nyc-taxi.parquet")});
const coordinator = new vgplot.Coordinator();
coordinator.databaseConnector(vgplot.wasmConnector({duckdb: db._db}));
const vg = vgplot.createAPIContext({coordinator});
const sql = db.sql.bind(db);
```

The code below creates three views, coordinated by Mosaic’s [crossfilter](https://uwdata.github.io/mosaic/api/core/selection.html#selection-crossfilter) helper.

```js echo
// Create a shared filter
const $filter = vg.Selection.crossfilter();

// Shared attributes for the maps
const attributes = [
  vg.width(315),
  vg.height(550),
  vg.margin(0),
  vg.xAxis(null),
  vg.yAxis(null),
  vg.xDomain([297000, 297000 + 28.36 * 315]),
  vg.yDomain([57900, 57900 + 28.36 * 550]), // ensure aspect ratio of 1
  vg.colorScale("symlog")
];

// Create two side-by-side maps
const maps = vg.hconcat(
  vg.plot(
    vg.raster(vg.from("trips", {filterBy: $filter}), {x: "px", y: "py", imageRendering: "pixelated"}),
    vg.intervalXY({as: $filter}),
    vg.text([{label: "Taxi pickups"}], {
      dx: 10,
      dy: 10,
      text: "label",
      fill: "white",
      frameAnchor: "top-left"
    }),
    ...attributes,
    vg.colorScheme("turbo"),
    vg.frame({stroke: "black"})
  ),
  vg.hspace(10),
  vg.plot(
    vg.raster(vg.from("trips", {filterBy: $filter}), {x: "dx", y: "dy", imageRendering: "pixelated"}),
    vg.intervalXY({as: $filter}),
    vg.text([{label: "Taxi dropoffs"}], {
      dx: 10,
      dy: 10,
      text: "label",
      fill: "white",
      frameAnchor: "top-left"
    }),
    ...attributes,
    vg.colorScheme("turbo"),
    vg.frame({stroke: "black"})
  )
);

// Create the histogram
const histogram = vg.plot(
  vg.rectY(vg.from("trips"), {x: vg.bin("time"), y: vg.count(), insetLeft: 0.5, insetRight: 0.5}),
  vg.intervalX({as: $filter}),
  vg.yTickFormat("s"),
  vg.xLabel("Hour of pickup"),
  vg.yLabel("Number of rides"),
  vg.width(640),
  vg.height(100)
);
```

For more Mosaic examples, see the [Mosaic + Framework](https://uwdata.github.io/mosaic-framework-example/) website.
