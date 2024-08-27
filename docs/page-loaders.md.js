process.stdout.write(`---
keywords: server-side rendering, ssr
---

# Page loaders <a href="https://github.com/observablehq/framework/pull/1523" class="observablehq-version-badge" data-version="prerelease" title="Added in #1523"></a>

Page loaders are like [data loaders](./data-loaders), but for generating (or “server-side rendering”) dynamic pages. Page loaders are programs that emit [Markdown](./markdown) to standard out, and have a double extension starting with \`.md\`, such as \`.md.js\` for a JavaScript page loader or \`.md.py\` for a Python page loader.

For example, to render a static map of recent earthquakes in SVG using D3:

~~~js run=false
import * as d3 from "d3-geo";

const projection = d3.geoOrthographic().rotate([110, -40]);
const path = d3.geoPath(projection);
const quakes = await (await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson")).json();

process.stdout.write(\`# Recent quakes

<div class="card" style="max-width: 960px;">
  <svg style="width: 100%; height: auto;" viewBox="0 0 960 500" width="960" height="500" xmlns="http://www.w3.org/2000/svg">
    <path stroke="currentColor" d="$\{path({type: "Sphere"})}"></path>
    <path stroke="currentColor" d="$\{path(d3.geoGraticule10())}"></path>
    <path fill="var(--theme-red)" fill-opacity="0.8" d="$\{path(quakes)}"></path>
  </svg>
</div>
\`);
~~~

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

I can also refer to it dynamically as $\\{observable.params.product}.

But not sure why I would do that over $\{product}.

~~~js
1 + observable.params.product
~~~

~~~js
1 + $\{JSON.stringify(product)}
~~~

\`);
~~~~

<div class="tip">

To allow importing of a JavaScript page loader without running it, have the page loader check whether \`process.argv[1]\` is the same as \`import.meta.url\` before running:

~~~js run=false
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(\`# Hello page\`);
}
~~~

</div>
`);
