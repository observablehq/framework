---
index: true
---

# jQuery UI

[jQuery UI](https://jqueryui.com/) is a set of user interface interactions, effects, widgets, and themes built on top of the jQuery JavaScript Library.

<link rel="stylesheet" href="npm:jquery-ui/dist/themes/base/jquery-ui.css">

```html run=false
<link rel="stylesheet" href="npm:jquery-ui/dist/themes/base/jquery-ui.css">
```

```js echo
import $ from "npm:jquery";
self.jQuery = $;
await import("npm:jquery-ui");
```

Price range: ${value.join("–")}

```md run=false
Price range: ${value.join("–")}
```

<div style="max-width: 320px;" id="slider"></div>

```html run=false
<div style="max-width: 320px;" id="slider"></div>
```

```js echo
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
