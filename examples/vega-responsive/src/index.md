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
