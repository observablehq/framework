---
keywords: embedded analytics, embeds, iframe, exporting, exports
---

# Embedding <a href="https://github.com/observablehq/framework/releases/tag/v1.12.0" class="observablehq-version-badge" data-version="^1.12.0" title="Added in 1.12.0"></a>

In addition to standalone apps, you can use Framework to embed interactive views within other applications. Framework supports multiple approaches to embedding:

- [exported modules](#exported-modules) for seamless integration and performance,
- [exported files](#exported-files) for hotlinking images, data, and other assets, or
- [iframe embeds](#iframe-embeds) for compatibility.

## Exported modules

Framework allows [JavaScript modules](./imports#local-imports) to be exported for use in another application. Exported modules are vanilla JavaScript and behave identically in an external web application as on a Framework page. As with local modules, exported modules can load data from a [static file](./files) or a [data loader](./data-loaders), [import](./imports) other local modules, and import libraries from [npm](./imports#npm-imports) or [JSR](./imports#jsr-imports).

Exported modules typically define **data components**: functions that render dynamic content, such as a chart or table, by returning a DOM element. Data components can take options (or “props”), and load any needed data using [`FileAttachment`](./files). For example, the `chart.js` module below exports a `Chart` data component that loads a CSV file and renders a responsive scatterplot of global surface temperature.

```js run=false
import * as Plot from "npm:@observablehq/plot";
import {FileAttachment, resize} from "observablehq:stdlib";

export async function Chart() {
  const gistemp = await FileAttachment("./lib/gistemp.csv").csv({typed: true});
  return resize((width) =>
    Plot.plot({
      width,
      y: {grid: true},
      color: {scheme: "burd"},
      marks: [Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"}), Plot.ruleY([0])]
    })
  );
}
```

Data components benefit from Framework’s baked data architecture for instant loads. File and import resolutions are baked into exported modules at build time. Libraries from npm are [self-hosted](./imports#self-hosting-of-npm-imports) for stability, security, and performance. And transitive static imports are preloaded to avoid long request chains.

To export a module, declare the module’s path in your [config file](./config) using the [**dynamicPaths** option](./config#dynamic-paths). For example, to export the module named `chart.js`:

```js run=false
export default {
  dynamicPaths: [
    "/chart.js"
  ]
};
```

Or for [parameterized routes](./params), name the module `product-[id]/chart.js`, then load a list of product identifiers from a database with a SQL query:

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

### Importing exported modules

An exported module can then be imported into a vanilla web application like so:

```html run=false
<script type="module">

import {Chart} from "https://my-workspace.observablehq.cloud/my-app/chart.js";

document.body.append(await Chart());

</script>
```

<div class="warning" label="Coming soon">

Observable Cloud support for cross-origin resource sharing (CORS) is not yet generally available and is needed for exported modules. If you are interested in beta-testing this feature, please [email us](mailto:support@observablehq.com). For public apps, you can use a third-party host supporting CORS such as GitHub Pages.

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

Some web tooling such as Vite and Webpack erroneously rewrite external dynamic imports. You may need to include a comment such as `import(/* @vite-ignore */ …)` or `import(/* webpackIgnore: true */ …)` to disable this behavior.

</div>

## Exported files

You can declare specific files to export using the [**dynamicPaths** config option](./config#dynamic-paths). Exported files are published under a stable URL that can be linked to and loaded from an external application. Exported files can be either [static](./files) or generated dynamically by [data loaders](./data-loaders). And you can use [parameterized routes](./params).

For example, say you want to chart downloads of open-source libraries you maintain. You could use a data loader to server-side render SVG with Observable Plot. (See Plot’s [Getting Started](https://observablehq.com/plot/getting-started#plot-in-node-js) guide.) In your config file, list the charts you want to build:

```js run=false
export default {
  dynamicPaths: [
    "/@observablehq/framework/downloads-dark.svg",
    "/@observablehq/framework/downloads.svg",
    "/@observablehq/plot/downloads-dark.svg",
    "/@observablehq/plot/downloads.svg",
    "/@observablehq/runtime/downloads-dark.svg",
    "/@observablehq/runtime/downloads.svg"
  ]
};
```

Once your app is deployed, you can then load the generated SVG into another app — or READMEs on GitHub — using the `img` tag. For example, below is a chart of daily downloads of Observable Framework powered by our [open-source analytics](https://github.com/observablehq/oss-analytics/).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://observablehq.observablehq.cloud/oss-analytics/@observablehq/framework/downloads-dark.svg">
  <img style="margin-top: 1rem;" alt="Daily downloads of Observable Framework" src="https://observablehq.observablehq.cloud/oss-analytics/@observablehq/framework/downloads.svg">
</picture>

```html run=false
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://observablehq.observablehq.cloud/oss-analytics/@observablehq/framework/downloads-dark.svg">
  <img alt="Daily downloads of Observable Framework" src="https://observablehq.observablehq.cloud/oss-analytics/@observablehq/framework/downloads.svg">
</picture>
```

## Iframe embeds

You can alternatively embed Framework pages using iframes. Pages that are intended to be embedded via iframe typically disable Framework’s built-in user interface using [Markdown front matter](./markdown#front-matter):

```yaml
---
sidebar: false
header: false
footer: false
pager: false
---
```

For the page `/chart`, you can declare an iframe like so:

```html run=false
<iframe scrolling="no" src="https://my-workspace.observablehq.cloud/my-app/chart"></iframe>
```

With a little bit of additional JavaScript, you can also implement [responsive iframe embeds](https://observablehq.observablehq.cloud/framework-example-responsive-iframe/) which resize automatically to fit the content of the page.
