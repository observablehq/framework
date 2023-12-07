# Hypertext Literal

[Hypertext Literal](https://github.com/observablehq/htl) is a tagged template literal for HTML which interpolates _values based on context_, allowing automatic escaping and the interpolation of non-serializable values.

Hypertext Literal is available by default as `htl` in Markdown, together with its methods `html` and `svg`. You can import it explicitly like so:

```js echo
import {html} from "npm:htl";
```

```js echo
html`<span ${{
  style: {
    background: "yellow",
    padding: "3px",
    cursor: "pointer",
    userSelect: "none"
  },
  onclick() {
    this.style.background = d3.interpolateRainbow(Math.random());
  }
}}>Click me!</span>`
```

The `svg` method likewise generates contextual SVG fragments, which can be useful, say, to position two charts side by side:

```js echo
import {svg} from "npm:htl";
```

```js echo
const chart1 = Plot.barY([3, 4, 2, 7, 5]).plot({width: 120, height: 80});
const chart2 = Plot.barY([5, 1, 7, 6, 2]).plot({width: 120, height: 80});
display(svg`<svg width=260 height=80>
  <g>${chart1}</g>
  <g ${{transform: "translate(140,0)"}}>${chart2}</g>
</svg>`);
```

If you prefer using `htl.html` and `htl.svg`, just import everything:

```js echo
import * as htl from "npm:htl";
```

