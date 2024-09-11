# Embedded analytics <a href="https://github.com/observablehq/framework/pull/1637" class="observablehq-version-badge" data-version="prerelease" title="Added in #1637"></a>

In addition to generating full-page apps, Framework can generate modules to embed analytics — such as individual charts or tables, or coordinated interactive views — in external applications. Embedded modules take full advantage of Framework’s polyglot, baked data architecture for instant page loads.

Embedded modules are vanilla JavaScript, and behave identically when embedded in an external application as on a Framework page. As always, you can load data from a [data loader](./data-loaders) using [`FileAttachment`](./files), and you can [import](./imports) [self-hosted](./imports#self-hosting-of-npm-imports) local modules and libraries from npm; file and import resolutions are baked into the generated code at build time so that imported modules “just work”.

Embedded modules are often written as component functions that return DOM elements. These functions can take options (or “props”), and typically load their own data. For example, below is a simple `chart.js` module that exports a `Chart` function that renders a scatterplot of global surface temperature data.

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

<div class="note">

When Framework builds your app, any transitive static imports are preloaded automatically when the embedded module is imported. This ensures optimal performance by avoiding long request chains.

</div>

## Embedding modules

To allow a module to be embedded in an external application, declare the module’s path in your [config file](./config) using the [**dynamicPaths** option](./config#dynamic-paths). For example, to embed a single component named `chart.js`:

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

<div class="note">

If the external (host) application is on a different origin than the Framework app — for example, if the host application is on example.com and the Framework app is on app.example.com — then you will need to [enable CORS](https://enable-cors.org/) on app.example.com or use a proxy to forward requests from example.com to app.example.com for same-origin serving.

</div>

In React, you can do something similar using [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and [`useEffect`](https://react.dev/reference/react/useEffect) and [`useRef`](https://react.dev/reference/react/useRef) hooks (see this example live on [StackBlitz](https://stackblitz.com/edit/observable-framework-embed-react?file=src%2FApp.tsx)):

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

A Framework page can serve as live documentation for your component: you can describe and demonstrate all the states and options for your component, and review the behavior visually.
