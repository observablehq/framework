---
keywords: viewof
---

# Reactivity

TODO More important than the code running out of order is that you can use reactivity to handle interactivity. For example, you can use a slider to change a value and see the result immediately. Also, it simplifies asynchronous programming, because promises are implicitly awaited.

JavaScript in Markdown runs reactively: in topological order as determined by [top-level variable](#top-level-variables) references, as in a spreadsheet. For example, here we reference variables `x` and `y` even though they are defined in a code block below:

```js echo
x + y
```

When code (such as `x + y`) references top-level variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs after the *defining* code. Since code runs independently of its order on the page, giving you the flexibility to arrange your code however you like.

In addition to meaning you can write your code in any code, reactivity also means that code is evaluated incrementally when values change. In general, this means that interaction is much more performant, because you’re not re-rendering the entire page when something changes.

Special treatment for:

- [Promises](#promises) (implicit await)
- [Generators](#generators) (implicit iteration)
- Editing code during runtime

Reactivity (implicit await and iteration) only applies _across_ code blocks, not _within_ a code block — hence we say reactivity applies only to [top-level variables](#top-level-variables) that are visible across code blocks. So if one code block defines a promise, and a second code block references that promise, the second code block will wait for the promise to resolve before running; but if you reference the promise within the first code block, you’ll see a promise, not the resolved value.

## Top-level variables

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```js echo
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively). Top-level variable declarations are effectively [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page, and code runs in topological rather than top-down document order.

To prevent variables from being visible outside the current block, make them local with a block statement:

```js echo
{
  const z = 3;
}
```

If multiple blocks define top-level variables with the same name, these blocks will still run, but any references to these variables in other blocks will throw a duplicate definition error because the definition is ambiguous.

## Promises

<div class="tip">See <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">MDN’s <i>Using promises</i></a> for an introduction to promises.</div>

A [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) represents the result of an asynchronous operation: some data loaded from a file, say, or a module imported dynamically, or the end of an animation, or some text input from the user. For the most part, you can use promises in Framework the same way you use them in any vanilla JavaScript environment. But there’s one special feature of Framework that makes working with promises a bit more convenient:

**When one code block refers to a promise defined in another code block, the referencing code block implicitly awaits the promise.**

We call this *implicit `await`*.

Implicit `await` only applies _across_ code blocks, not _within_ a code block.

And it means instead of needing to `await` a promise defined in another code block, the entire code block waits for the promise to resolve before running. This makes it easier to work with promises in Framework, because you don’t have to worry about whether a promise has resolved before you use it.

Declaring a file attachment without an await.

```js echo
const volcano = FileAttachment("./javascript/volcano.json").json();
```
```js echo
volcano
```

Declaring multiple file attachments means that the files will load in parallel. This is faster than loading them sequentially using explicit `await`, and simpler than using `Promise.all`.

```js run=false
const a = FileAttachment("a.csv").csv({typed: true});
const b = FileAttachment("b.csv").csv({typed: true});
const c = FileAttachment("c.csv").csv({typed: true});
```

Implicit await causes the entire code block to wait, not just the expression that references the promise.

```js echo
const fast = new Promise((resolve) => setTimeout(() => resolve("fast"), 500));
const slow = new Promise((resolve) => setTimeout(() => resolve("slow"), 5000));
```
```js echo
display(fast);
display(slow);
```

Implicit await means that you wait for the defining code block to fulfill, not just the referenced promise.

```js echo
const one = 1;
const two = 2;
await new Promise((resolve) => setTimeout(resolve, 5000));
```
```js echo
one + two // waits 5 seconds!
```

Implicit await means that you can’t handle errors across code blocks. However, you can handle errors _within_ a code block. For example, you could specify fallback data for a file that fails to load.

```js run=false
const volcano = FileAttachment("volcano.json")
  .json()
  .catch(() => ({width: 87, height: 61, values: []}));
```

TK Replace a synchronous variable with a promise without changing the referencing code.

Most often, promises are used to load files, fetch data from a remote server, or query a database. TK Elaborate some more and give more specific examples of promises, including `FileAttachment`, `fetch`, `db.sql`, waiting to click on a button.

As a contrived example, within the block below, `hello` is a promise that resolves via `setTimeout`; if you reference `hello` from another code block or expression, the other code won’t run until the timeout fires and will see `hello` as a string.

```js echo
const hello = new Promise((resolve) => {
  setTimeout(() => {
    resolve("hello");
  }, 1000);
});
```

Hello is: ${hello}.

## Generators

Values that change over time — such as interactive inputs, animation parameters, or streaming data — can be represented reactively in Framework as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). When a top-level generator is declared, code in other blocks sees the generator’s latest yielded value and runs each time the generator yields a new value.

<!-- TK Talk about how this is different than just using a `requestAnimationFrame` loop because you can write your animation more declaratively, and then maybe you can have a scrubber that controls the animation instead of being driven by time.
-->

For example, here is a generator `j` that increments once a second:

```js echo
const j = (async function* () {
  for (let j = 0; true; ++j) {
    yield j;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();
```

The value of j is: ${j}.

```md
The value of j is: ${j}.
```

If the generator does not explicitly `await`, the generator will yield every [animation frame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame), which is typically 60 times per second. Also, the generator will automatically pause when the page is put in a background tab.

```js echo
const i = (function* () {
  for (let i = 0; true; ++i) {
    yield i;
  }
})();
```

The value of i is: ${i}.

```md
The value of i is: ${i}.
```

The examples above are “scripted” generators, meaning that the code dictates a fixed sequence of output values over time (1, 2, 3…). This demonstrates the concept of generators, but it’s not representative of generators in practice.

More commonly, generators in Framework are used to represent user input. And the purpose of the generator is to represent the user input as a [reactive variable](./reactivity), such that any code that references this user input automatically re-runs when the user changes their input.

Normally we don’t implement the generator manually; we use a helper method.

And here’s an HTML input element using [`Generators.input`](<../lib/generators#input(element)>):

<input id="nameInput">

```html run=false
<input id="nameInput">
```
```js echo
const name = Generators.input(nameInput);
```

```js echo
name
```

Or using `Generators.observe`…

```js run=false
const name = Generators.observe((notify) => {
  const inputted = () => notify(nameInput.value);
  inputted();
  nameInput.addEventListener("input", inputted);
  return () => nameInput.removeEventListener("input", inputted);
});
```

Or manually implementing the generator…

```js run=false
const name = (async function* () {
  let resolve;
  const inputted = () => resolve?.();
  nameInput.addEventListener("input", inputted);
  try {
    while (true) {
      yield nameInput.value;
      await new Promise((_) => (resolve = _));
    }
  } finally {
    nameInput.removeEventListener("input", inputted);
  }
})();
```

As you might imagine, you can use such a generator to drive an animation.

With canvas:

<canvas id="canvas" width="640" height="32"></canvas>

```html run=false
<canvas id="canvas" width="640" height="32"></canvas>
```
```js echo
const context = canvas.getContext("2d");
```
```js echo
context.clearRect(0, 0, 640, 32);
context.fillStyle = "#4269d0";
context.fillRect((i % (640 + 32)) - 32, 0, 32, 32);
```

Or with SVG:

```svg echo
<svg width="640" height="32">
  <rect fill="#4269d0" width="32" height="32" x=${(i % (640 + 32)) - 32}></rect>
</svg>
```

You could do the same thing with a `requestAnimationFrame` loop, but then you have to remember to handle the `invalidation` promise so that the animation loop is terminated when the code is re-evaluated; otherwise you could have multiple animation loops happening concurrently, competing for the same canvas.

As another example, you can use the built-in [`Generators.observe`](<../lib/generators#observe(change)>) to represent the current pointer coordinates:

```js echo
const pointer = Generators.observe((change) => {
  const pointermoved = (event) => change([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  change([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.

```md
Pointer is: ${pointer.map(Math.round).join(", ")}.
```

See [Data: Web sockets](./data#web-sockets) for an example of using a generator to stream live data.

## Mutables

Normally, only the code block that declares a [top-level variable](./reactivity) can define it or assign to it. You can however use the `Mutable` function to declare a mutable generator, allowing other code to mutate the generator’s value.

`Mutable` is available by default in Markdown but you can import it explicitly like so:

```js echo
import {Mutable} from "npm:@observablehq/stdlib";
```

Then to use it:

```js echo
const count = Mutable(0);
const increment = () => ++count.value;
const reset = () => count.value = 0;
```

In other code, you can now create buttons to increment and reset the count like so:

```js echo
Inputs.button([["Increment", increment], ["Reset", reset]])
```

<style type="text/css">
@keyframes flash {
  from { background-color: var(--theme-blue); }
  to { background-color: none; }
}
.flash {
  animation-name: flash;
  animation-duration: 1s;
}
</style>

Count is: ${html`<span class="flash">${count}</span>`}.

```md
Count is: ${html`<span class="flash">${count}</span>`}.
```

Within the defining code block, `count` is a generator and `count.value` can be read and written to as desired; in other code, `count` is the generator’s current value. Other code that references `count` will re-run automatically whenever `count.value` is reassigned — so be careful you don’t cause an infinite loop!

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

### view(*element*)

The [`view` function](#view(element)) is a wrapper for `display` that returns a [value generator](./reactivity#generators) for the given input element (rather than the input element itself). For example, below we display an input element and expose its value to the page as the variable `text`.

```js echo
const text = view(html`<input type="text" placeholder="Type something here">`);
```

```js echo
text // Try typing into the box above
```

When you type into the textbox, the generator will yield a new value, triggering the [reactive evaluation](./reactivity) of any code blocks that reference `text`. See [Inputs](./reactivity#inputs) for more.

The `view` function used above does two things:

1. it [displays](#display(value)) the given DOM *element*, and then
2. returns its corresponding [value generator](./reactivity#generators).

The `view` function uses [`Generators.input`](../lib/generators#input(element)) under the hood. You can also call `Generators.input` directly, say to declare the input as a top-level variable without immediately displaying it:

```js echo
const nameInput = html`<input type="text" placeholder="anonymous">`;
const name = Generators.input(nameInput);
```

As a top-level variable, you can then display the input anywhere you like, such as within a [card](./layout#card) using an [inline expression](./javascript#inline-expressions). And you can reference the input’s value reactively anywhere, too.

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

## Invalidation

With reactive evaluation, code blocks can run multiple times, say in response to interaction or streaming data. If you need to “clean up” after a code block, say to cancel an animation loop or close a socket, use the `invalidation` promise to register a disposal hook.

For example, the cell below uses `requestAnimationFrame` to animate a canvas. The `invalidation` promise is used to cancel the old animation when a new animation starts. Try quickly clicking the button below.

```js
const clicks = view(Inputs.button("Click", {label: "Run cell"}));
const colors = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0"];
const duration = 2000;
```

<canvas id="canvas" width="640" height="30" style="max-width: 100%; height: 30px;"></canvas>

```js echo
const canvas = document.querySelector("#canvas");
const context = canvas.getContext("2d");
const color = colors[clicks % 4]; // cycle through colors on click
const start = performance.now(); // when the animation started

let frame = requestAnimationFrame(function tick(now) {
  const t = Math.min(1, (now - start) / duration);
  context.fillStyle = color;
  context.fillRect(0, 0, t * canvas.width, canvas.height);
  if (t < 1) frame = requestAnimationFrame(tick);
});

invalidation.then(() => cancelAnimationFrame(frame));
```

## Visibility

The `visibility` function returns a promise that resolves when the code block’s display root is visible. This allows you to defer animation or computation until the content scrolls into view. If you missed the animation, try reloading the page and then scrolling down.

<canvas id="canvas2" width="640" height="30" style="max-width: 100%; height: 30px;"></canvas>

```js echo
await visibility(); // wait until this node is visible

const canvas = document.querySelector("#canvas2");
const context = canvas.getContext("2d");
const start = performance.now();

let frame = requestAnimationFrame(function tick(now) {
  const t = Math.min(1, (now - start) / duration);
  context.fillStyle = "#a463f2";
  context.fillRect(0, 0, t * canvas.width, canvas.height);
  if (t < 1) frame = requestAnimationFrame(tick);
});
```
