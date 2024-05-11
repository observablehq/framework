# Vega-Lite responsive bar chart

The bar chart below resizes to fit the container. Try resizing the window.

Rather than use Vega-Lite’s built-in [responsive width](https://vega.github.io/vega-lite/docs/size.html#specifying-responsive-width-and-height) — which only listens to window _resize_ events and doesn’t work correctly when the container is initially detached, or when the page content changes — we use Observable Framework’s built-in [`resize` function](https://observablehq.com/framework/javascript#responsive-display) which handles all cases thanks to [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).

```js echo
const chart = await vl.render({
  spec: {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "width": -1,
    "height": 250,
    "autosize": {"type": "fit", "contains": "padding"},
    "data": {"url": "https://vega.github.io/vega-lite/data/cars.json"},
    "mark": "bar",
    "encoding": {
      "x": {"field": "Cylinders"},
      "y": {"aggregate": "count", "title": "Number of cars"}
    }
  }
});

display(resize((width) => {
  chart.value.width(Math.min(960 - 16 * 2, width));
  chart.value.run();
  return chart;
}));
```

If you prefer a more reusable solution, you can create a `vlresize` function like so in a `vlresize.js` module that you can import into any page.

```js run=false
import {resize} from "npm:@observablehq/stdlib";
import vl from "observablehq:stdlib/vega-lite";

export async function vlresize(spec, {minWidth = 0, maxWidth = Infinity} = {}) {
  const chart = await vl.render({spec});
  return resize((width) => {
    chart.value.width(Math.max(minWidth, Math.min(maxWidth, width)));
    chart.value.run();
    return chart;
  });
}
```

You can then import `vlresize` like so:

```js echo
import {vlresize} from "./vlresize.js";
```

And call it like so:

```js echo
vlresize({
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": -1,
  "height": 250,
  "autosize": {"type": "fit", "contains": "padding"},
  "data": {"url": "https://vega.github.io/vega-lite/data/cars.json"},
  "mark": "bar",
  "encoding": {
    "x": {"field": "Cylinders"},
    "y": {"aggregate": "count", "title": "Number of cars"}
  }
}, {
  maxWidth: 960 - 16 * 2
})
```
