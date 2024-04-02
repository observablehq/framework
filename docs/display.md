---
keywords: viewof
---

# Display

The built-in `display` function displays the specified value.

```js echo
const x = Math.random();

display(x);
```

You can display structured objects, too. Click on the object below to inspect it.

```js echo
display({hello: {subject: "world"}, numbers: [1, 2, 3, 4]})
```

Calling `display` multiple times will display multiple values. Values are displayed in the order they are received. (Previously-displayed values will be cleared when the associated code block or inline expression is re-run.)

```js echo
for (let i = 0; i < 5; ++i) {
  display(i);
}
```

If you pass `display` a DOM node, it will be inserted directly into the page. Use this technique to render dynamic displays of data, such as charts and tables. Here is an example displaying a [text node](https://developer.mozilla.org/en-US/docs/Web/API/Document/createTextNode) created using the [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction):

```js echo
display(document.createTextNode(`Your lucky number is ${Math.floor(Math.random () * 10)}!`));
```

<div class="note">
  <p>This is a contrived example — you wouldn’t normally create a text node by hand. Instead, you’d use an <a href="./javascript#inline-expressions">inline expression</a> to interpolate a value into Markdown. For example:</p>
  <pre><code class="language-md">Your lucky number is &dollar;{Math.floor(Math.random () * 10)}!</code></pre>
</div>

You’ll often pass <code>display</code> a DOM node when you’re using a helper library such as <a href="./lib/plot">Observable Plot</a> or <a href="./lib/inputs">Observable Inputs</a> or a custom component (a function you’ve written that returns a DOM node) to create content. For example, the above can be written using [Hypertext Literal](./lib/htl) as:

```js echo
display(html`Your lucky number is ${Math.floor(Math.random () * 10)}!`);
```

The `display` function returns the passed-in value. You can display any value (any expression) in code, not only top-level variables; use this as an alternative to `console.log` to debug your code.

```js echo
const y = display(Math.random());
```

The value of `y` is ${y}.

```md
The value of `y` is ${y}.
```

When the value passed to `display` is not a DOM element or node, the behavior of `display` depends on whether it is called within a fenced code block or an inline expression. In fenced code blocks, `display` will use the [Observable Inspector](https://github.com/observablehq/inspector).

```js echo
display([1, 2, 3]);
```

In inline expressions, `display` will coerce non-DOM values to strings and concatenate iterables.

${display([1, 2, 3])}

```md
${display([1, 2, 3])}
```

## Implicit display

JavaScript expression fenced code blocks are implicitly wrapped with a call to [`display`](#display(value)). For example, this arithmetic expression displays implicitly:

```js echo
1 + 2 // implicit display
```

Implicit display only applies to expression code blocks, not program code blocks: the value won’t implicitly display if you add a semicolon. (Watch out for [Prettier](https://prettier.io/)!)

```js echo
1 + 2; // no implicit display
```

Implicit display also doesn’t apply if you reference the `display` function explicitly (_i.e._, we wouldn’t want to show `2` twice below).

```js echo
display(1), display(2) // no implicit display
```

The same is true for inline expressions `${…}`.

${1 + 2}

```md
${1 + 2}
```

${display(1), display(2)}

```md
${display(1), display(2)}
```

## Responsive display

In Markdown, the built-in `width` reactive variable represents the current width of the main element. This can be a handy thing to pass, say, as the **width** option to [Observable Plot](./lib/plot).

```html echo
The current width is ${width}.
```

```js
import {resize} from "npm:@observablehq/stdlib";
```

(Internally, `width` is implemented by [`Generators.width`](./lib/generators#width(element)).)

For more control, or in a [grid](./css/grid) where you want to respond to either width or height changing, use the built-in `resize` helper. This takes a render function which is called whenever the width or height [changes](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), and the element returned by the render function is inserted into the DOM.

```html echo
<div class="grid grid-cols-4">
  <div class="card">
    ${resize((width) => `This card is ${width}px wide.`)}
  </div>
</div>
```

If your container defines a height, such as `240px` in the example below, then you can use both the `width` and `height` arguments to the render function:

```html echo
<div class="grid grid-cols-2" style="grid-auto-rows: 240px;">
  <div class="card" style="padding: 0;">
    ${resize((width, height) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height}))}
  </div>
  <div class="card" style="padding: 0;">
    ${resize((width, height) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height}))}
  </div>
</div>
```

<div class="tip">If you are using <code>resize</code> with both <code>width</code> and <code>height</code> and see nothing rendered, it may be because your parent container does not have its own height specified. When both arguments are used, the rendered element is implicitly <code>position: absolute</code> to avoid affecting the size of its parent and causing a feedback loop.</div>

## Inputs

Inputs are graphical user interface elements such as dropdowns, radios, sliders, and text boxes that accept data from a user and enable interaction via [reactivity](./reactivity). They can also be custom elements that you design, such as charts that support interactive selection via pointing or brushing.

Inputs might prompt a viewer to:

- Filter a table of users by typing in a name
- Select a URL from a dropdown to view traffic to a specific page
- Choose a date range to explore data within a period of interest

Inputs are typically displayed using the built-in [`view`](#view(element)) function, which [displays](#display(value)) the given element and returns a [value generator](./reactivity#generators). The generator can then be declared as a [top-level variable](./reactivity) to expose the input’s value to the page. For example, the radio input below prompts the user to select their favorite team:

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

<div class="tip">To be compatible with <code>view</code>, custom inputs must emit <code>input</code> events and expose their current value as <i>element</i>.value. See <a href="./lib/generators#input(element)"><code>Generators.input</code></a> for more.</div>

More often, you’ll use a helper library such as [Observable Inputs](./lib/inputs) or [Observable Plot](./lib/plot) to declare inputs. For example, here is [`Inputs.range`](./lib/inputs#range):

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

## display(*value*)

If `value` is a DOM node, adds it to the page. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

The `display` function is scoped to each code block, meaning that the `display` function is a closure bound to where it will display on the page. But you can capture a code block’s `display` function by assigning it to a [top-level variable](./reactivity):

```js echo
const displayThere = display;
```

Then you can reference it from other cells:

```js echo
Inputs.button("Click me", {value: 0, reduce: (i) => displayThere(++i)})
```

## view(*element*)

The [`view` function](#view(element)) is a wrapper for `display` that returns a [value generator](./reactivity#generators) for the given input element (rather than the input element itself). For example, below we display an input element and expose its value to the page as the variable `text`.

```js echo
const text = view(html`<input type="text" placeholder="Type something here">`);
```

```js echo
text // Try typing into the box above
```

When you type into the textbox, the generator will yield a new value, triggering the [reactive evaluation](./reactivity) of any code blocks that reference `text`. See [Inputs](#inputs) for more.

The `view` function used above does two things:

1. it [displays](#display(value)) the given DOM *element*, and then
2. returns its corresponding [value generator](./reactivity#generators).

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
