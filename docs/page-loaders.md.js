process.stdout.write(`---
keywords: server-side rendering, ssr
---

# Page loaders <a href="https://github.com/observablehq/framework/pull/1523" class="observablehq-version-badge" data-version="prerelease" title="Added in #1523"></a>

Page loaders are like [data loaders](./data-loaders), but for dynamically generating (or “server-side rendering”) pages. Page loaders are programs that emit [Markdown](./markdown) to standard out, and have a double extension starting with \`.md\`, such as \`.md.js\` for a JavaScript page loader or \`.md.py\` for a Python page loader.

By “baking” dynamically-generated content into static Markdown, you can further improve the performance of pages since the content exists on page load rather than waiting for JavaScript to run. You may even be able to avoid loading additional assets and JavaScript libraries.

For example, to render a map of recent earthquakes into static SVG using D3:

~~~js run=false
import * as d3 from "d3-geo";
import * as topojson from "topojson-client";

const quakes = await (await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson")).json();
const world = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json")).json();
const land = topojson.feature(world, world.objects.land);

const projection = d3.geoOrthographic().rotate([110, -40]).fitExtent([[2, 2], [638, 638]], {type: "Sphere"});
const path = d3.geoPath(projection);

process.stdout.write(\`# Recent quakes

<svg style="max-width: 640px; width: 100%; height: auto;" viewBox="0 0 640 640" width="640" height="640" xmlns="http://www.w3.org/2000/svg" fill="none">
  <path stroke="currentColor" stroke-opacity="0.1" d="$\{path(d3.geoGraticule10())}"></path>
  <path stroke="currentColor" stroke-width="1.5" d="$\{path({type: "Sphere"})}"></path>
  <path stroke="var(--theme-foreground-faint)" d="$\{path(land)}"></path>
  <path stroke="var(--theme-red)" stroke-width="1.5" d="$\{path(quakes)}"></path>
</svg>
\`);
~~~

<div class="tip">

When using page loaders, keep an eye on the generated page size, particularly with complex maps and data visualizations in SVG. To keep the page size small, consider server-side rendering a low-fidelity placeholder and then replacing it with the full graphic using JavaScript on the client.

</div>

## Parameterized pages

Page loaders often use [parameterized routes](./params) to generate multiple pages from a single program. Parameter values are passed as command-line arguments. In a JavaScript page loader, you can use [\`parseArgs\`](https://nodejs.org/api/util.html#utilparseargsconfig) from \`node:util\` to parse command-line arguments. You can then bake parameter values into the resulting page, or reference them dynamically in JavaScript using \`observable.params\`.

~~~~js run=false
import {parseArgs} from "node:util";

const {
  values: {product}
} = parseArgs({
  options: {product: {type: "string"}}
});

process.stdout.write(\`# Hello $\{product}

Or alternatively, $\\{observable.params.product}.
\`);
~~~~

Framework’s [theme previews](./themes) are implemented as parameterized page loaders; see [their source](https://github.com/observablehq/framework/blob/main/docs/theme/%5Btheme%5D.md.ts) for a practical example.

<div class="tip">

To allow importing of a JavaScript page loader without running it, have the page loader check whether \`process.argv[1]\` is the same as \`import.meta.url\` before running:

~~~js run=false
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(\`# Hello page\`);
}
~~~

</div>
`);
