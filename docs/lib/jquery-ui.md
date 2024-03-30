# jQuery UI

<link rel="stylesheet" href="npm:jquery-ui/dist/themes/base/jquery-ui.css">

```js echo
import $ from "npm:jquery";
self.jQuery = $;
await import("npm:jquery-ui");
```

<p>
  <label for="amount">Price range:</label>
  ${value.join("–")}
</p>

<div style="max-width: 320px;" id="slider"></div>

```js
const value = Generators.observe((notify) => {
  const slider = $("#slider");
  slider.slider({
    range: true,
    min: 0,
    max: 500,
    values: [5, 300],
    slide: (event, ui) => notify(ui.values)
  });
  notify(slider.slider("values"));
});
```
