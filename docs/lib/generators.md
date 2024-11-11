---
keywords: [dark, width]
---

# Observable Generators

The Observable standard library includes several generator utilities. These are available by default in Markdown as `Generators`, but you can import them explicitly:

```js echo
import {Generators} from "observablehq:stdlib";
```

## input(*element*)

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/input.js) · Returns an async generator that yields whenever the given *element* emits an *input* event, with the given *element*’s current value. (It’s a bit fancier than that because we special-case a few element types.) The built-in [`view` function](<../reactivity#inputs>) uses this.

```js echo
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

```js echo
name
```

## observe(*initialize*)

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/observe.js) · Returns an async generator that immediately invokes the specified *initialize* function, being passed a *change* callback function, and yields the passed value whenever *change* is called. The *initialize* function may optionally return a *dispose* function that will be called when the generator is terminated.

```js echo
const hash = Generators.observe((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  changed();
  return () => removeEventListener("hashchange", changed);
});
```
```js echo
hash
```

## queue(*change*)

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/queue.js) · Returns an async generator that immediately invokes the specified *initialize* function, being passed a *change* callback function, and yields the passed value whenever *change* is called. The *initialize* function may optionally return a *dispose* function that will be called when the generator is terminated.

This is identical to `Generators.observe` except that if *change* is called multiple times before the consumer has a chance to process the yielded result, values will not be dropped; use this if you require that the consumer not miss a yielded value.

```js run=false
const hash = Generators.queue((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  changed();
  return () => removeEventListener("hashchange", changed);
});
```
```js echo
hash
```

## now()

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/now.js) · Returns a generator that repeatedly yields `Date.now()`, forever. This generator is available by default as `now` in Markdown.

```js run=false
const now = Generators.now();
```

```js echo
now
```

## width(*element*)

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/width.ts) · Returns an async generator that yields the width of the given target *element*. Using a [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), the generator will yield whenever the width of the *element* changes. This generator for the `main` element is available by default as `width` in Markdown.

```js run=false
const width = Generators.width(document.querySelector("main"));
```

```js echo
width
```

## dark() <a href="https://github.com/observablehq/framework/releases/tag/v1.3.0" class="observablehq-version-badge" data-version="^1.3.0" title="Added in 1.3.0"></a>

[Source](https://github.com/observablehq/framework/blob/main/src/client/stdlib/generators/dark.ts) · Returns an async generator that yields a boolean indicating whether the page is currently displayed with a dark [color scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme).

```js run=false
const dark = Generators.dark();
```

If the page supports both light and dark mode (as with the [default theme](../themes)), the value reflects the user’s [preferred color scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme). The generator will yield a new value if the preferred color changes — as when the user changes their system settings, or if the user’s system adapts automatically to the diurnal cycle — allowing you to update the display as needed without requiring a page reload.

If the page only supports light mode, the value is always false; likewise it is always true if the page only has a dark theme.

The current theme is: *${dark ? "dark" : "light"}*.

```md run=false
The current theme is: *${dark ? "dark" : "light"}*.
```

This generator is available by default as `dark` in Markdown. It can be used to pick a [color scheme](https://observablehq.com/plot/features/scales#color-scales) for a chart, or an appropriate [mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode):

```js echo
Plot.plot({
  height: 260,
  color: {scheme: dark ? "turbo" : "ylgnbu"},
  marks: [
    Plot.rectY(
      olympians,
      Plot.binX(
        {y2: "count"},
        {
          x: "weight",
          fill: "weight",
          z: "sex",
          mixBlendMode: dark ? "screen" : "multiply"
        }
      )
    ),
    Plot.ruleY([0])
  ]
})
```
