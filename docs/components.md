# Components

You don’t have to start from scratch: components are reusable pieces of code (functions, themes, snippets, etc.) that make it quicker to update page layout and appearance, and add common page content.

The Observable CLI offers three flavors of components: [layout helpers](#layout-helpers), [Observable Plot snippets](#observable-plot-snippets), and [Observable Inputs](#observable-inputs).

## Layout helpers

A collection of elements useful for formatting page content: themes, cards, and the `resize` function.

### Themes

Observable Markdown offers a number of [built-in themes](./config#theme) that you can compose to create, say, wide pages with an alternative dark color theme:

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

### Card

The [`card`](./layout/card) CSS class has default styles that help create a card: container borders, background color, padding and optional titles and subtitles. 

<div class="grid grid-cols-2">
  <div class="card">
    <h2>A card title</h2>
    <h3>A card subtitle</h3>
    ${
    Plot.plot({
      marks: [
        Plot.dot(penguins, {x: "body_mass_g", y: "flipper_length_mm"})
      ]
    })
    }
    </div>
  <div class="card">
    <p>Tortor condimentum lacinia quis vel eros. Arcu risus quis varius quam quisque id. Magnis dis parturient montes nascetur ridiculus mus mauris. Porttitor leo a diam sollicitudin. Odio facilisis mauris sit amet massa vitae tortor. Nibh venenatis cras sed felis eget velit aliquet sagittis. Ullamcorper sit amet risus nullam eget felis eget nunc. In egestas erat imperdiet sed euismod nisi porta lorem mollis. A erat nam at lectus urna duis convallis. Id eu nisl nunc mi ipsum faucibus vitae. Purus ut faucibus pulvinar elementum integer enim neque volutpat ac.</p>
    </div>
</div>

```html run=false
<div class="grid grid-cols-2">
  <div class="card">
    <h2>A card title</h2>
    <h3>A card subtitle</h3>
    ${
    Plot.plot({
      marks: [
        Plot.dot(penguins, {x: "body_mass_g", y: "flipper_length_mm"})
      ]
    })
    }
    </div>
  <div class="card">
    <p>Tortor condimentum lacinia quis vel eros. Arcu risus quis varius quam quisque id. Magnis dis parturient montes nascetur ridiculus mus mauris. Porttitor leo a diam sollicitudin. Odio facilisis mauris sit amet massa vitae tortor. Nibh venenatis cras sed felis eget velit aliquet sagittis. Ullamcorper sit amet risus nullam eget felis eget nunc. In egestas erat imperdiet sed euismod nisi porta lorem mollis. A erat nam at lectus urna duis convallis. Id eu nisl nunc mi ipsum faucibus vitae. Purus ut faucibus pulvinar elementum integer enim neque volutpat ac.</p>
    </div>
</div>
```

### Resize

The [`resize`](./javascript/display#responsive-display) function automatically recomputes a DOM element (often, a chart) when the dimensions of its parent container change. 

Resize exists in the Observable standard library, or can be imported explicitly:

```js
import {resize} from "npm:@observablehq/stdlib";
```

<div>
    ${resize((width) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width}))}
  </div>

```html run=false
<div>
    ${resize((width) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width}))}
  </div>
```

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

## Observable Inputs

The [Observable Inputs](./lib/inputs) library provides a suite of lightweight interface components — buttons, sliders, dropdowns, checkboxes, and the like — that viewers can update to explore interactive displays (for example, selecting only a few of many categories to show in a bar chart).

The [radio input](./inputs/radio) prompts a user to select a penguin species:

```js echo
const pickSpecies = view(Inputs.radio(["Adelie", "Chinstrap", "Gentoo"], {value: "Gentoo", label: "Penguin species:"}))
```

The value of `pickSpecies` (<tt>="${pickSpecies}"</tt>) can then be accessed elsewhere in the page, as a parameter in other computations, and to create interactive charts, tables or text with [inline expressions](./javascript#inline-expressions).