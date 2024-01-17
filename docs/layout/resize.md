# Layout: Resize

**`resize()`** is a helper function that provides a way to set the size of a chart, or other content, to fit into a container on your page.  To use it, import **`resize()`**:

```js echo
import {resize} from "npm:@observablehq/dash";
```

Then call **resize()** with a function which renders your content:

```js echo
html`<div class="grid grid-cols-4" style="grid-auto-rows: 200px;">
  <div>
    ${resize((width, height) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height}))}
  </div>
  <div>
    ${resize((width, height) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height}))}
  </div>
</div>`
```

**`resize()`** takes a function that renders content, like a chart.  When the page is rendered **`resize()`** calls the render function with the **width** and, optionally the **height**, of its parent container.  If the page changes size, **`resize()`** calls your function again with the new **width** and **height** values that re-renders the content to fit in the newly resized page.
