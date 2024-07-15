# Data loader to generate PNG from canvas

Here’s a Node.js data loader that creates a map using [node-canvas](https://github.com/Automattic/node-canvas) and D3, then writes the map to standard out as a PNG.

This pattern can be used to render maps that require a large amount of data as lightweight static files.

```js run=false
import {createCanvas} from "canvas";
import {geoPath} from "d3";
import * as topojson from "topojson-client";

// Get the map file from the US Atlas package
// https://github.com/topojson/us-atlas
const url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json";
const us = await fetch(url).then(response => response.json());

// Create and configure a canvas
const width = 975;
const height = 610;
const canvas = createCanvas(width * 2, height * 2);
const context = canvas.getContext("2d");
context.scale(2, 2);

// https://observablehq.com/@d3/u-s-map-canvas
context.lineJoin = "round";
context.lineCap = "round";
// Use the null projection, since coordinates in US Atlas are already projected.
const path = geoPath(null, context);

context.fillStyle = "#fff";
context.fillRect(0, 0, width, height);

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
const buffer = canvas.toBuffer("image/png");

// Pipe the buffer to process.stdout
process.stdout.write(buffer);
```

<div class="note">

To run this data loader, you’ll need to add the `d3`, `topojson-client` and `canvas` libraries as dependencies with `npm add d3 topojson-client canvas` or `yarn add d3 topojson-client canvas`.

</div>

The above data loader lives in `data/us-map.png.js`, so we can access the image using `data/us-map.png`:

```html run=false
<img src="data/us-map.png" style="max-width: 975px;">
```

<img src="data/us-map.png" style="max-width: 975px;">
