# Vega-Lite

[Vega-Lite](https://vega.github.io/vega-lite/) is a “high-level grammar of interactive graphics” with “concise, declarative syntax to create an expressive range of visualizations for data analysis and presentation.” It is an alternative to [Observable Plot](./plot). Vega-Lite is available by default in Markdown as `vl`, but you can import it explicitly as:

```js run=false
import * as vega from "npm:vega";
import * as vegaLite from "npm:vega-lite";
import * as vegaLiteApi from "npm:vega-lite-api";

const vl = vegaLiteApi.register(vega, vegaLite);
```

You can use the [Vega-Lite JavaScript API](https://vega.github.io/vega-lite-api/) to construct a chart:

```js echo
vl.markBar()
  .data(alphabet)
  .encode(vl.x().fieldQ("frequency"), vl.y().fieldN("letter"))
  .width(640)
  .render()
```

Or you can use a [Vega-Lite JSON view specification](https://vega.github.io/vega-lite/docs/spec.html):

```js echo
vl.render({
  spec: {
    width: 640,
    height: 400,
    data: {url: await FileAttachment("gistemp.csv").url(), format: {type: "csv"}},
    mark: "point",
    encoding: {
      x: {type: "temporal", field: "Date"},
      y: {type: "quantitative", field: "Anomaly"},
      color: {type: "quantitative", field: "Anomaly", scale: {range: "diverging", reverse: true}}
    }
  }
})
```

<div class="tip">When loading data from a file as above, use <a href="../javascript/files"><code>FileAttachment</code></a> so that referenced files are included on <a href="../getting-started#build">build</a>.</div>
