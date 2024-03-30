# jQuery UI

```js echo
import $ from "npm:jquery";
import "npm:jquery-ui";
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
