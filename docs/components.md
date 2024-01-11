# Components

You don’t have to start from scratch: components are reusable pieces of code (functions, themes, snippets, etc.) that make it quicker to update page layout and appearance, and add common page content.

The Observable CLI offers three flavors of components: [layout helpers](#layout-helpers), [Observable Plot snippets](#observable-plot-snippets), and [Observable Inputs](#observable-inputs).

## Layout helpers

A collection of elements commonly used in dashboards and reports: themes, cards, and dash utilities.

### Themes

<!-- TODO may need to update theme names based on changes, e.g. ocean-floor-->

Observable Markdown offers a few [built-in themes](./layout/themes) that you can compose to create, say, wide pages with an alternative dark color theme:

```js run=false
theme: ["dark-alt", "wide"]
```

The code above, when included in the [config file](./config), specifies the default theme for the project. In addition, you can specify the theme for a single page in its [front matter](markdown#front-matter):

```yaml
---
theme: ["dark-alt", "wide"]
---
```

You are not limited to the built-in themes. For complete control over the design of your project, see the [style option](./config/#style) instead.

### Cards & grid

The [`card`](./layout/card) CSS class has default styles that help create a card: container borders, background color, padding… Combined with the grid layout, this gives developers control about… TODO more better explain.

TODO a link to [grid](grid)?

### Dash utilities

The nascent [Observable Dash](lib/dash) library includes useful functions to create dashboard. Currently:

#### Dash.number

<!-- TODO may need update if library or function name changes -->

The “big number” component [`Dash.number`](./layout/bignumber) adds a nicely formatted number box with titles, primary and secondary values, and trend arrow.

<!-- TODO add Dash.number example when merged -->

#### Dash.resizer

<!-- TODO may need update if library or function name changes -->

The [`Dash.resizer](./layout/resize) component automatically recomputes a DOM element (often, a chart) when the dimensions of its parent container change.

<!-- TODO add Dash.resizer example when merged -->

## Observable Plot snippets

[Observable Plot](https://observablehq.com/plot/) is a free, open source JavaScript library for concise and expressive data visualization, built by Observable.

Several examples of Observable Plot code are included in this documentation, covering some common chart types including area charts ([stacked](./charts/area#stacked-area-chart) and [band area](./charts/area#band-area-chart)), bar charts ([sorted](./charts/bar#sorted-bar-chart), [temporal](./charts/bar#temporal-bar-chart), and [weighted](./charts/bar#weighted-top-10-bar-chart)), line charts ([single-series](./charts/line#basic-line-chart), [multi-series](./charts/line#multi-series-line-chart) and [moving average](./charts/line#moving-average-line-chart)), [scatterplots](./charts/dot#scatterplot), and more. See [Observable Plot’s gallery](https://observablehq.com/@observablehq/plot-gallery) for even more examples.

All our examples use common datasets that are loaded when referenced by name, such as the `weather` dataset in the code snippet below.

```js echo
Plot.plot({
  marks: [
    Plot.cell(weather, {
      x: d => d.date.getUTCDate(),
      y: d => d.date.getUTCMonth(),
      fill: "temp_max"
    })
  ]
})
```

If the chart type you want to add is not included as a snippet here, don’t sweat - a great number of examples (in both [Observable Plot](https://observablehq.com/@observablehq/plot-gallery) and [D3](https://observablehq.com/@d3/gallery)) are available to explore and reuse.

**Can I use other data visualization libraries?** Absolutely. Use any other visualization library you like by [importing from npm](./javascript/imports).

For example, to use [vega-lite](https://vega.github.io/vega-lite/):

```js echo
import * as Vega from "npm:vega";
import * as VegaLite from "npm:vega-lite";

function vl(spec) {
  const div = document.createElement("div");
  const view = div.value = new Vega.View(Vega.parse(VegaLite.compile(spec).spec));
  return view.initialize(div).runAsync().then(() => div);
};
```

```js echo
vl({
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {values: weather},
  "title": "Daily Max Temperatures (C) in Seattle, WA",
  "config": {
      "view": {
          "strokeWidth": 0,
          "step": 13
      },
      "axis": {
          "domain": false
      }
  },
  "mark": "rect",
  "encoding": {
      "x": {
          "field": "date",
          "timeUnit": "date",
          "type": "ordinal",
          "title": "Day",
          "axis": {
              "labelAngle": 0,
              "format": "%e"
          }
      },
      "y": {
          "field": "date",
          "timeUnit": "month",
          "type": "ordinal",
          "title": "Month"
      },
      "color": {
          "field": "temp_max",
          "aggregate": "max",
          "type": "quantitative",
          "legend": {
              "title": null
          }
      }
  }
}
)
```

## Observable Inputs

The [Observable Inputs](./lib/inputs) library provides a suite of lightweight interface components — buttons, sliders, dropdowns, checkboxes, and the like — that viewers can update to explore interactive displays (for example, selecting only a few of many categories to show in a bar chart).

The [radio input](./inputs/radio) prompts a user to select a penguin species:

```js echo
const pickSpecies = view(Inputs.radio(["Adelie", "Chinstrap", "Gentoo"], {value: "Gentoo", label: "Penguin species:"}))
```

The value of `pickSpecies` (<tt>="${pickSpecies}"</tt>) can then be accessed elsewhere in the page, as a parameter in other computations, and to create interactive charts, tables or text with [inline expressions](./javascript#inline-expressions).
