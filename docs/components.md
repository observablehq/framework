# Components

Components are reusable pieces of code (functions, themes, snippets, etc.) that make it quicker and easier for you to update page layout and appearance, and add common page content (like charts, inputs, and big numbers).

The Observable CLI offers three flavors of components: [Layout helpers](#layout-helpers), [Observable Plot snippets](#observable-plot-snippets), and [Observable Inputs](#observable-inputs).

## Layout helpers

Layout helpers let you quickly update page layout and appearance and add several specialty elements commonly used in dashboards (like big number boxes). The following are currently available in the CLI: themes, cards, Dash.number, and Dash.resizer.

### Themes
<!-- TODO may need to update theme names based on changes, e.g. ocean-floor-->

Five [pre-built themes](./layout/themes.md) are currently available: `dark`, `dark-alt`, `light`, `light-alt`, and `wide`. Make global theme updates in the [`observablehq.config.js` (or `observablehq.config.ts`) file](./config) located in the project root:

```js run=false
theme: ["dark-alt", "light"]
```

Or, update the theme for a single page in the .md frontmatter: 

```yaml
---
theme: ["dark-alt"]
---
```

For custom themes, see the [style option](./config/#style) to instead use custom stylesheet.  

### Cards

The [`card`](./layout/card) class decouples card styling (like container borders, background color, and padding) from the grid layout. This gives developers control over what appears within a styled card, and what exists within a grid layout but *without* card styling (for example, explanatory text alongside a chart).  

### Dash.number 
<!-- TODO may need update if library or function name changes -->

[`Dash.number`](./layout/bignumber) adds a nicely formatted big number box with titles, primary and secondary values, and trend arrow.

<!-- TODO add Dash.number example when merged -->

### Dash.resizer
<!-- TODO may need update if library or function name changes -->

[`Dash.resizer](./layout/resize) automatically resize a DOM element (often, a chart) to fit dimensions of the parent container.

<!-- TODO add Dash.resizer example when merged -->

## Observable Plot snippets

[Observable Plot](https://observablehq.com/plot/) is a free, open source JavaScript library for concise and expressive data visualization, built and maintained by Observable. Observable Plot is included in the Observable standard library, so is available for use out-of-the-box when working in the CLI. 

For convenience, copyable Observable Plot code is included for common chart types including area charts ([stacked](./charts/area#stacked-area-chart) and [band area](./charts/area#band-area-chart)), bar charts ([sorted](./charts/bar#sorted-bar-chart), [temporal](./charts/bar#temporal-bar-chart), and [weighted](./charts/bar#weighted-top-10-bar-chart)), line charts ([single-series](./charts/line#basic-line-chart), [multi-series](./charts/line#multi-series-line-chart) and [moving average](./charts/line#moving-average-line-chart)), [scatterplots](./charts/dot#scatterplot), and more. 

Each snippet uses a built-in dataset. The snippet below creates a heatmap (with Observable Plot’s [cell mark](https://observablehq.com/plot/marks/cell)) of daily temperatures using the *weather* data: 

```js echo
Plot.plot({
  marks: [
    Plot.cell(weather.slice(-365), {
      x: d => d.date.getUTCDate(),
      y: d => d.date.getUTCMonth(),
      fill: "temp_max"
    })
  ]
})
```

If the chart type you want to add is not included as a snippet here, don’t sweat - a great number of examples (in both [Observable Plot](https://observablehq.com/@observablehq/plot-gallery) and [D3](https://observablehq.com/@d3/gallery)) are available to explore and reuse.

**Can I use other data visualization libraries?** Absolutely. Use other visualization libraries already in Observable’s standard library (like [D3](./lib/d3), [DOT](./lib/dot), or [mermaid](./lib/mermaid)), or [import any other library from npm](./javascript/imports).

## Observable Inputs

The [Observable Inputs](./lib/inputs) library provides a suite of lightweight interface components — buttons, sliders, dropdowns, checkboxes, and the like — that viewers can update to explore interactive displays (for example, selecting only a few of many categories to show in a bar chart). Inputs are available for use out-of-the-box as part of the Observable standard library. 

The [radio input](./inputs/radio) prompts a user to select a penguin species: 

```js echo
const pickSpecies = view(Inputs.radio(["Adelie", "Chinstrap", "Gentoo"], {value: "Gentoo", label: "Penguin species:"}))
```

Input values can then be accessed elsewhere in the page to create interactive charts, tables or text with [inline expressions](./javascript#inline-expressions). For example, the currently selected species is ${pickSpecies}!








