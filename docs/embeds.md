# Embedded analytics <a href="https://github.com/observablehq/framework/pull/1637" class="observablehq-version-badge" data-version="prerelease" title="Added in #1637"></a>

In addition to full-page apps, Framework can generate JavaScript modules to embed analytics in external applications. Embedded modules can take full advantage of Framework’s baked data architecture via polyglot [data loaders](./data-loaders) for instant loads, and you can use [parameterized routes](./params) to generate views dynamically.

To allow a [JavaScript module](./imports#local-imports) to be embedded in an external application, declare the module’s path in your [config file](./config) using the [**dynamicPaths** option](./config#dynamic-paths). For example, to embed a component named `chart.js`:

```js run=false
export default {
  dynamicPaths: [
    "/chart.js"
  ]
};
```

Embedded modules are vanilla JavaScript, and will behave identically when embedded in an external application as on a Framework page. As always, you can load data using [`FileAttachment`](./files) or [import](./imports) local modules and libraries from npm; file and import resolutions are baked into the generated code at build time so that imported module “just works”.

Often, embedded modules are written as functions that return DOM elements. These functions can take options (or “props”), and are typically responsible for loading their own data. For example, below is a simple `chart.js` module that exports a `Chart` function that renders a scatterplot.

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

This component can be imported into a vanilla web application like so:

```html run=false
<script type="module">

import {Chart} from "https://my-workspace.observablehq.cloud/my-app/chart.js";

document.body.append(await Chart());

</script>
```

<div class="note">

The code above assumes the Framework app is called “my-app” and that it’s deployed to Observable Cloud in the workspace named “my-workspace”.

</div>

In React, you can do something similar using [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and a [`useEffect`](https://react.dev/reference/react/useEffect) and [`useRef`](https://react.dev/reference/react/useRef) hooks:

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

To develop your component, you can import it into a Framework page like so:

```js echo
import {Chart} from "./chart.js";

display(await Chart());
```
