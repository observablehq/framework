# Embedded analytics <a href="https://github.com/observablehq/framework/pull/1637" class="observablehq-version-badge" data-version="prerelease" title="Added in #1637"></a>

In addition to full-page apps, Framework can generate modules to embed analytics in external applications. Embedded modules can take full advantage of Framework’s polyglot, baked data architecture for instant page loads.

To allow a [JavaScript module](./imports#local-imports) to be embedded in an external application, declare the module’s path in your [config file](./config) using the [**dynamicPaths** option](./config#dynamic-paths). For example, to embed a single component named `chart.js`:

```js run=false
export default {
  dynamicPaths: [
    "/chart.js"
  ]
};
```

Or for [parameterized routes](./params), name the component `product-[id]/chart.js`, then load a list of product identifiers from a database with a SQL query:

```js run=false
import postgres from "postgres";

const sql = postgres(); // Note: uses psql environment variables

export default {
  async *dynamicPaths() {
    for await (const {id} of sql`SELECT id FROM products`.cursor()) {
      yield `/product-${id}/chart.js`;
    }
  }
};
```

Embedded modules are vanilla JavaScript, and will behave identically when embedded in an external application as on a Framework page. As always, you can load data from a [data loader](./data-loaders) using [`FileAttachment`](./files), and you can [import](./imports) [self-hosted](./imports#self-hosting-of-npm-imports) local modules and libraries from npm; file and import resolutions are baked into the generated code at build time so that imported module “just works”.

Embedded modules are often written as functions that return DOM elements. These functions can take options (or “props”), and  typically load their own data via `FileAttachment`. For example, below is a simple `chart.js` module that exports a `Chart` function that renders a scatterplot.

```js run=false
import {FileAttachment} from "npm:@observablehq/stdlib";
import * as Plot from "npm:@observablehq/plot";

export async function Chart() {
  const gistemp = await FileAttachment("./lib/gistemp.csv").csv({typed: true});
  return Plot.plot({
    y: {grid: true},
    color: {scheme: "burd"},
    marks: [
      Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"}),
      Plot.ruleY([0])
    ]
  });
}
```

When Framework builds your app, any transitive static imports needed are preloaded automatically when the module is imported. This can significantly improve performance by avoiding long request chains.

## Embedding modules

An embedded component can be imported into a vanilla web application like so:

```html run=false
<script type="module">

import {Chart} from "https://my-workspace.observablehq.cloud/my-app/chart.js";

document.body.append(await Chart());

</script>
```

<div class="note">

The code above assumes the Framework app is called “my-app” and that it’s deployed to Observable Cloud in the workspace named “my-workspace”.

</div>

In React, you can do something similar using [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and [`useEffect`](https://react.dev/reference/react/useEffect) and [`useRef`](https://react.dev/reference/react/useRef) hooks:

```jsx run=false
import {useEffect, useRef} from "react";

export function EmbedChart() {
  const ref = useRef(null);

  useEffect(() => {
    let parent = ref.current, child;
    import("https://my-workspace.observablehq.cloud/my-app/chart.js")
      .then(({Chart}) => Chart())
      .then((chart) => parent?.append((child = chart)));
    return () => ((parent = null), child?.remove());
  }, []);

  return <div ref={ref} />;
}
```

<div class="tip">

Since both dynamic import and the imported component are async, the code above is careful to clean up the effect and avoid race conditions.

</div>

<div class="tip">

You can alternatively embed Framework pages using [iframe embeds](https://observablehq.observablehq.cloud/framework-example-responsive-iframe/).

</div>

## Developing modules

To develop your component, you can import it into a Framework page like normal, giving you instant reactivity as you make changes to the component or its data.

```js echo
import {Chart} from "./chart.js";
```

To instantiate the imported component, simply call the function:

```js echo
Chart()
```

A Framework page can serve as live and documentation for your component: you can describe and demonstrate all the states and options for your component, and review the behavior visually.
