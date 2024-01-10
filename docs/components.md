# Components

Components are reusable pieces of code that make it quicker and easier to control page layout and add common page content (like charts, big numbers, and expandable text).

The Observable CLI offers three flavors of components: 

1. Layout helpers 
2. Observable Plot snippets
3. Observable Inputs

## Layout helpers

Layout helpers let you quickly control the arrangement of page content and add common dashboard elements. The following layout helpers are included: 

- [card](<!-- Update -->): Add polished card styling to dashboard content, with options for titles and subtitles
- [Dash.BigNumber](<!-- Update -->): Add a big number box with optional titles, trend and formatting
- [Dash.resize](<!-- Update -->): Automatically resize dashboard components
<!-- TODO what else? -->

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

### Can I use other data visualization libraries? 

Absolutely. Use other visualization libraries already in Observable’s standard library (like [D3](./lib/d3), [DOT](./lib/dot), or [mermaid](./lib/mermaid)), or [import any other library from npm](./javascript/imports).

## Observable Inputs

Observable Inputs are lightweight interface components — buttons, sliders, dropdowns, checkboxes, and the like — that help you explore data and build interactive displays. Inputs are commonly used to let users interact with data displays (visualizations, tables, etc.). 



## Build your own components 








