# Hypertext Literal

Observable’s [Hypertext Literal](https://github.com/observablehq/htl) is a “tagged template literal for HTML which interpolates values _based on context_, allowing automatic escaping and the interpolation of non-serializable values, such as event listeners, style objects, and other DOM nodes.”

Hypertext Literal is available by default as `htl` in Markdown, together with its methods `html` and `svg`. You can import it explicitly like so:

```js echo
import {html} from "npm:htl";
```

Here’s an example of Hypertext Literal safely escaping input:

```js echo
html`My favorite band is “${"dollar&pound"}” not “dollar&pound”!`
```

As another example, is a button with a *click* event listener:

```js echo
html`<button data-count="0" onclick=${({currentTarget: button}) => {
  const count = button.dataset.count = +button.dataset.count + 1;
  button.textContent = `${count} click${count === 1 ? "" : "s"}`;
}}>Click me!</button>`
```

The `svg` method likewise generates contextual SVG fragments, which can be useful, say, to position two charts side by side:

```js echo
import {svg} from "npm:htl";
```

```js echo
svg`<svg width="400" height="120">
  <g>
    ${Plot.barY([3, 4, 2, 7, 5]).plot({margin: 20, width: 200, height: 120})}
  </g>
  <g transform="translate(200, 0)">
    ${Plot.barY([5, 1, 7, 6, 2]).plot({margin: 20, width: 200, height: 120})}
  </g>
</svg>`
```

If you prefer using `htl.html` and `htl.svg`, just import everything:

```js echo
import * as htl from "npm:htl";
```

