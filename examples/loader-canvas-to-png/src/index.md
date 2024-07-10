# Data loader to generate PNG from canvas

Here’s a Node.js data loader that creates a canvas map using d3, and then returns the map as a PNG file to standard out.

This pattern could be used to render maps that require with a large amount of data as lightweight static files.

```js run=false
import * as canvas from 'canvas';
import * as d3 from 'd3';
import * as topojson from "topojson-client";

// Get the map file from the US Atlas package
// https://github.com/topojson/us-atlas
const url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json";
const us = await fetch(url).then(response => response.json());

// Create and configure a canvas
const width = 975;
const height = 610;
const cvs = canvas.createCanvas(width, height);
const context = cvs.getContext("2d");

// Draw the map based on the official d3 example
// https://observablehq.com/@d3/u-s-map-canvas
context.lineJoin = "round";
context.lineCap = "round";
const path = d3.geoPath(null, context);

context.beginPath();
path(topojson.mesh(us, us.objects.counties, (a, b) => a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0)));
context.lineWidth = 0.5;
context.strokeStyle = "#aaa";
context.stroke();

context.beginPath();
path(topojson.mesh(us, us.objects.states, (a, b) => a !== b));
context.lineWidth = 0.5;
context.strokeStyle = "#000";
context.stroke();

context.beginPath();
path(topojson.feature(us, us.objects.nation));
context.lineWidth = 1;
context.strokeStyle = "#000";
context.stroke();

// Write the canvas to a PNG buffer
const buffer = cvs.toBuffer("image/png");

// Pipe the buffer to process.stdout
process.stdout.write(buffer);
```

<div class="note">

To run this data loader, you’ll need the `d3`, `topojson-client` and `canvas` libraries available on your `$PATH`.

</div>

The above data loader lives in `data/us-map.png.js`, so we can access the image using `data/us-map.png`:

```html run=false
<img src="data/us-map.png" style="max-width: 975px;">
```

<img src="data/us-map.png" style="max-width: 975px;">
