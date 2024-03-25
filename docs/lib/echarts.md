---
index: true
---

# Apache ECharts <a href="https://github.com/observablehq/framework/releases/tag/v1.1.0" class="observablehq-version-badge" data-version="^1.1.0" title="Added in v1.1.0"></a>

[Apache ECharts](https://echarts.apache.org), an open-source JavaScript visualization library, is available by default as `echarts` in Markdown. You can also import it explicitly like so:

```js run=false
import * as echarts from "npm:echarts";
```

To use ECharts, declare a container element with the desired dimensions, [display it](../javascript/display), and then call `echarts.init`.

```js echo
const myChart = echarts.init(display(html`<div style="width: 600px; height:400px;"></div>`));

myChart.setOption({
  title: {
    text: "ECharts getting started example"
  },
  tooltip: {},
  xAxis: {
    data: ["shirt", "cardigan", "chiffon", "pants", "heels", "socks"]
  },
  yAxis: {},
  series: [
    {
      name: "sales",
      type: "bar",
      data: [5, 20, 36, 10, 10, 20]
    }
  ]
});
```
