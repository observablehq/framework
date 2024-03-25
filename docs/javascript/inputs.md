---
keywords: viewof
---

# JavaScript: Inputs

Inputs are graphical user interface elements such as dropdowns, radios, sliders, and text boxes that accept data from a user and enable interaction via [reactivity](./reactivity). They can also be custom elements that you design, such as charts that support interactive selection via pointing or brushing.

Inputs might prompt a viewer to:

- Filter a table of users by typing in a name
- Select a URL from a dropdown to view traffic to a specific page
- Choose a date range to explore data within a period of interest

Inputs are typically displayed using the built-in [`view`](#view(element)) function, which [displays](./display) the given element and returns a [value generator](./generators). The generator can then be declared as a [top-level variable](./reactivity) to expose the input’s value to the page. For example, the radio input below prompts the user to select their favorite team:

```js echo
const team = view(Inputs.radio(["Metropolis Meteors", "Rockford Peaches", "Bears"], {label: "Favorite team:", value: "Metropolis Meteors"}));
```

The `team` variable here will reactively update when the user interacts with the radio input, triggering re-evaluation of referencing code blocks. Select different teams in the radio input above to update the text.

My favorite baseball team is the ${team}!

```md run=false
My favorite baseball team is the ${team}!
```

You can implement custom inputs using arbitrary HTML. For example, here is a [range input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) that lets you choose an integer between 1 and 15 (inclusive):

```js echo
const n = view(html`<input type=range step=1 min=1 max=15>`);
```

```js echo
n // Try dragging the slider above
```

<div class="tip">To be compatible with <code>view</code>, custom inputs must emit <code>input</code> events and expose their current value as <i>element</i>.value. See <a href="../lib/generators#input(element)"><code>Generators.input</code></a> for more.</div>

More often, you’ll use a helper library such as [Observable Inputs](../lib/inputs) or [Observable Plot](../lib/plot) to declare inputs. For example, here is [`Inputs.range`](../lib/inputs#range):

```js echo
const m = view(Inputs.range([1, 15], {label: "Favorite number", step: 1}));
```

```js echo
m // Try dragging the slider above
```

To use a chart as an input, you can use Plot’s [pointer interaction](https://observablehq.com/plot/interactions/pointer), say by setting the **tip** option on a mark. In the scatterplot below, the penguin closest to the pointer is exposed as the reactive variable `penguin`.

```js echo
const penguin = view(Plot.dot(penguins, {x: "culmen_length_mm", y: "flipper_length_mm", tip: true}).plot());
```

```js echo
penguin
```

In the future, Plot will support more interaction methods, including brushing. Please upvote [#5](https://github.com/observablehq/plot/issues/5) if you are interested in this feature.

## view(*element*)

The `view` function used above does two things:

1. it [displays](./display) the given DOM *element*, and then
2. returns its corresponding [value generator](./generators).

The `view` function uses [`Generators.input`](../lib/generators#input(element)) under the hood. You can also call `Generators.input` directly, say to declare the input as a top-level variable without immediately displaying it:

```js echo
const nameInput = html`<input type="text" placeholder="anonymous">`;
const name = Generators.input(nameInput);
```

As a top-level variable, you can then display the input anywhere you like, such as within a [card](../css/card) using an [inline expression](../javascript#inline-expressions). And you can reference the input’s value reactively anywhere, too.

<div class="card" style="display: grid; gap: 0.5rem;">
  <div>Enter your name: ${nameInput}</div>
  <div>Hi <b>${name || "anonymous"}</b>!</div>
</div>

```html run=false
<div class="card" style="display: grid; gap: 0.5rem;">
  <div>Enter your name: ${nameInput}</div>
  <div>Hi <b>${name || "anonymous"}</b>!</div>
</div>
```
