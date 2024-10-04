---
keywords: viewof
---

# Reactivity

Framework runs like a spreadsheet: code re-runs automatically when referenced variables change. This brings:

- Easier interactivity because state is automatically kept in sync
- Easier asynchronous programming via implicit await of promises
- Better performance with incremental re-rendering
- Greater flexibility by writing code and prose in any order

Reactivity is especially helpful for data apps because these apps tend to have complex state. (See Observable’s founding essay, [_A Better Way to Code_](https://medium.com/@mbostock/a-better-way-to-code-2b1d2876a3a0).) For example, you might want to update a chart when a user interacts with a menu or composes a query. Or you might simply want to load several datasets in parallel. Reactivity means you don’t have to manage complex state changes — you can code declaratively as if state were static and immutable, letting the runtime manage state for you.

Unlike reactive libraries, Framework’s reactivity is implemented at the language layer as part of the JavaScript runtime: there’s no new API or syntax to learn. It’s vanilla JavaScript, but the code runs automatically. Code blocks in Markdown run in topological order determined by top-level variable references (a.k.a. _dataflow_), rather than in top-down document order. For example, here we reference variables `x` and `y` even though they are defined in a code block farther down the page:

```js echo
x + y
```

When code (such as `x + y`) references top-level variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs _after_ the *defining* code. Since code runs independent of its order on the page, you can arrange code however you like.

Reactivity also allows incremental evaluation of code when values change: only the code blocks that are downstream of changed variables run. This makes interaction and animation more performant because you’re not re-rendering the entire page when state changes.

To be precise, Framework’s reactivity manifests as:

- [Promises](#promises) are implicitly awaited across code blocks
- [Generators](#generators) are implicitly iterated across code blocks
- Editing code (or files) triggers reactive updates during preview
- The [`invalidation` promise](#invalidation) allows clean-up

We’ll cover each of these below.

## Top-level variables

<div class="tip">Only pages can declare top-level reactive variables. Components can’t define their own reactive state, but you can pass values to them.</div>

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```js echo
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively); top-level variable declarations are effectively [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting).

To prevent variables from being visible outside the current block, make them local with a block statement (curly braces):

```js echo
{
  const z = 3;
}
```

If multiple blocks define top-level variables with the same name, these blocks will still run, but any references to duplicated variables in other blocks will throw a duplicate definition error because the definition is ambiguous.

## Promises

<div class="tip">See <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">MDN’s <i>Using promises</i></a> for an introduction to promises.</div>

A [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) represents the result of an asynchronous operation: some data loaded from a file, say, or a module imported dynamically, or the end of an animation, or some text input from the user.

In Framework, when one code block refers to a promise defined in another code block, the referencing code block implicitly awaits the promise. This means promises are often invisible — you don’t have to worry whether something is a promise or whether it’s resolved.

<div class="note">Implicit <code>await</code> only applies <i>across</i> code blocks, not <i>within</i> a code block. Within a code block, a promise is just a promise.</div>

For example, below `file.json` returns a promise, and so the value of `volcano` inside the code block is a promise.

```js echo
const volcano = FileAttachment("volcano.json").json();
```

And yet if we reference `volcano` in another code block or inline expression, we don’t need to `await`. The `await` is implicit; the code block automatically waits for the `volcano` promise to resolve before running.

```js echo
volcano
```

The volcano dataset has ${volcano.values.length.toLocaleString("en-US")} values.

```md run=false
The volcano dataset has ${volcano.values.length.toLocaleString("en-US")} values.
```

This pattern is especially useful for loading multiple files. The files are loaded in parallel, and referencing code blocks only wait for the files they need. This is faster than loading files sequentially with `await`, and simpler than `Promise.all`.

```js run=false
const a = FileAttachment("a.csv").csv({typed: true});
const b = FileAttachment("b.csv").csv({typed: true});
const c = FileAttachment("c.csv").csv({typed: true});
```

Implicit await causes the entire code block to wait, not just expressions that reference promises. This distinction is usually invisible, but you might notice if you have a code block that references both “slow” and “fast” promises: the code block waits for all promises to resolve, and thus is gated by the slowest promise. Below, “fast” and “slow” are printed at the same time.

```js echo
const fast = new Promise((resolve) => setTimeout(() => resolve("fast"), 500));
const slow = new Promise((resolve) => setTimeout(() => resolve("slow"), 5000));
```
```js echo
display(fast);
display(slow);
```

Implicit await means waiting for the defining code block to fulfill, not only the referenced promises. Below, even though `one` and `two` are defined synchronously, the referencing code block must wait 5 seconds for the defining block to resolve. This allows a defining code block to initialize state asynchronously while preventing referencing code blocks from seeing partially-initialized state.

```js echo
const one = 1;
const two = 2;
await new Promise((resolve) => setTimeout(resolve, 5000));
```
```js echo
one + two // waits 5 seconds!
```

Implicit await means that you can’t handle errors across code blocks: if a promise rejects, the reference code block simply doesn’t run, so it has no way of catching errors. That said, you can handle errors _within_ a code block. For example, you can specify fallback data for a file that fails to load.

```js run=false
const volcano = FileAttachment("volcano.json")
  .json()
  .catch(() => ({width: 87, height: 61, values: []}));
```

## Generators

Values that change over time — such as interactive inputs, animation parameters, or streaming data — can be represented in Framework as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). When a top-level generator is declared, code in other blocks sees the generator’s latest yielded value and runs each time the generator yields a new value.

<div class="note">As with implicit await and promises, implicit iteration of generators only applies <i>across</i> code blocks, not <i>within</i> a code block.</div>

As an example, here’s an HTML input element. By passing it to [`Generators.input`](./lib/generators#input-element), we can define a generator that yields the input’s value each time it changes.

<input id="nameInput">

```html run=false
<input id="nameInput">
```
```js echo
const name = Generators.input(nameInput);
```

Now when we reference `name` in another code block or inline expression, it refers to the current value of the input element, and the code block runs each time the input changes. Try typing into the input field above.

```js echo
name
```

Hello, ${name || "anonymous"}!

```md run=false
Hello, ${name || "anonymous"}!
```

The above example uses `Generators.input`, which is a helper method that takes an input element and returns a corresponding value generator. More often, you’ll use the `view` function to define an [input](#inputs); we’ll cover that below, but first we’ll take a deeper look at how generators work.

The `Generators.observe` helper is a more general way to create a generator that “pushes” or “emits” events asynchronously. This helper takes an initializer function and passes it a `notify` callback which you call with each new value; the initializer can also return a disposal function to cleanup when the generator is terminated. The resulting generator yields each value you pass to `notify`. To implement the `name` generator above using `Generators.observe`:

```js run=false
const name = Generators.observe((notify) => {
  const inputted = () => notify(nameInput.value);
  inputted();
  nameInput.addEventListener("input", inputted);
  return () => nameInput.removeEventListener("input", inputted);
});
```

As another example, here is using `Generators.observe` to expose the current pointer coordinates as `pointer` = <span style="font-variant-numeric: tabular-nums;">[${pointer.join(", ")}]</span>:

```js echo
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

And here’s a generator `j` = <span style="font-variant-numeric: tabular-nums;">${j}</div> that increments once a second, defined directly by an immediately-invoked async generator function.

```js echo
const j = (async function* () {
  for (let j = 0; true; ++j) {
    yield j;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();
```

If a generator does not explicitly `await`, as `i` = <span style="font-variant-numeric: tabular-nums;">${i}</div> below, it will yield once every [animation frame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame), typically 60 times per second. Generators also automatically pause when the page is put in a background tab.

```js echo
const i = (function* () {
  for (let i = 0; true; ++i) {
    yield i;
  }
})();
```

As you might imagine, you can use such a generator to drive an animation. A generator is typically easier than a `requestAnimationFrame` loop because the animation is declarative — the code runs automatically whenever `i` changes — and because you don’t have to handle [invalidation](#invalidation) to terminate the loop.

<canvas id="canvas0" width="640" height="30" style="max-width: 100%; height: 30px;"></canvas>

```js
const context0 = canvas0.getContext("2d");
```

```js echo
context0.clearRect(0, 0, canvas0.width, canvas0.height);
context0.fillStyle = "#4269d0";
context0.fillRect((i % (640 + 32)) - 32, 0, 32, 32);
```

You can also use a generator to stream live data. Here is a WebSocket that reports the current price of Bitcoin via Unicorn Data Services.

```js echo
const socket = new WebSocket("wss://ws.eodhistoricaldata.com/ws/crypto?api_token=demo");
invalidation.then(() => socket.close());
socket.addEventListener("open", () => socket.send(JSON.stringify({action: "subscribe", symbols: "BTC-USD"})));
const btc = Generators.observe((notify) => {
  let currentValue;
  const messaged = (event) => {
    const m = JSON.parse(event.data);
    const v = +m.p;
    if (isNaN(v) || v === currentValue) return;
    notify((currentValue = v));
  };
  socket.addEventListener("message", messaged);
  return () => socket.removeEventListener("message", messaged);
});
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Bitcoin price (USD/BTC)</h2>
    <div class="big">${btc.toLocaleString("en-US", {style: "currency", currency: "USD"})}</div>
  </div>
</div>

```html run=false
<div class="grid grid-cols-4">
  <div class="card">
    <h2>Bitcoin price (USD/BTC)</h2>
    <div class="big">${btc.toLocaleString("en-US", {style: "currency", currency: "USD"})}</div>
  </div>
</div>
```

## Inputs

Inputs are graphical user interface elements such as dropdowns, radios, sliders, and text boxes that accept data from a user and enable interaction via reactivity. They can also be custom elements that you design, such as charts that support interactive selection via pointing or brushing.

Inputs might prompt a viewer to:

- Filter a table of users by typing in a name
- Select a URL from a dropdown to view traffic to a specific page
- Choose a date range to explore data within a period of interest

Inputs are typically displayed using the built-in `view` function, which [displays](./javascript#explicit-display) the given element and returns a corresponding value generator (`Generators.input`) to expose the input’s value to the page. For example, the radio input below prompts for your favorite team:

```js echo
const team = view(Inputs.radio(["Metropolis Meteors", "Rockford Peaches", "Bears"], {label: "Favorite team:", value: "Metropolis Meteors"}));
```

Code blocks that reference `team` re-run automatically when the user interacts with the radio input. Try selecting a different team.

My favorite baseball team is the ${team}!

```md run=false
My favorite baseball team is the ${team}!
```

The above example uses `Inputs.radio`, which is provided by [Observable Inputs](./lib/inputs). You can also implement custom inputs using arbitrary HTML. For example, here is a [range input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) that lets you choose an integer between 1 and 15 (inclusive):

```js echo
const n = view(html`<input type=range step=1 min=1 max=15>`);
```

```js echo
n // Try dragging the slider above
```

<div class="tip">To be compatible with <code>view</code>, custom inputs must emit <code>input</code> events when their value changes, and expose their current value as <i>element</i>.value. See <a href="./lib/generators#input-element"><code>Generators.input</code></a> for more.</div>

To use a chart as an input, you can use Plot’s [pointer interaction](https://observablehq.com/plot/interactions/pointer), say by setting the **tip** option on a mark. In the scatterplot below, the penguin closest to the pointer is exposed as the reactive variable `penguin`.

```js echo
const penguin = view(Plot.dot(penguins, {x: "culmen_length_mm", y: "flipper_length_mm", tip: true}).plot());
```

```js echo
penguin // try hovering the chart above
```

In the future, Plot will support more interaction methods, including brushing. Please upvote [#5](https://github.com/observablehq/plot/issues/5) if you are interested in this feature.

The `view` function does two things:

1. it [displays](./javascript#explicit-display) the given DOM *element*, and then
2. returns a corresponding value generator.

The `view` function uses [`Generators.input`](./lib/generators#input-element) under the hood. As shown above, you can call `Generators.input` directly, say to declare the input as a top-level variable without immediately displaying it.

```js echo
const subjectInput = html`<input type="text" placeholder="anonymous">`;
const subject = Generators.input(subjectInput);
```

You can then display the input anywhere you like. And you can reference the input’s value reactively anywhere, too. Below, both are displayed in a card.

<div class="card" style="display: grid; gap: 0.5rem;">
  <div>Enter your name: ${subjectInput}</div>
  <div>Hi <b>${subject || "anonymous"}</b>!</div>
</div>

```html run=false
<div class="card" style="display: grid; gap: 0.5rem;">
  <div>Enter your name: ${subjectInput}</div>
  <div>Hi <b>${subject || "anonymous"}</b>!</div>
</div>
```

## Mutables

Normally, only the code block that declares a top-level variable can define it or assign to it. You can however use the `Mutable` function to declare a mutable generator, allowing other code to mutate the generator’s value. This is similar to React’s `useState` hook.

`Mutable` is available by default in Markdown but you can import it explicitly like so:

```js echo
import {Mutable} from "observablehq:stdlib";
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

## Invalidation

With reactive evaluation, code blocks can run multiple times, say in response to interaction or streaming data. If you need to “clean up” after a code block, say to cancel an animation loop or close a socket, use the `invalidation` promise to register a disposal hook.

For example, the cell below uses `requestAnimationFrame` to animate a canvas. The `invalidation` promise is used to cancel the old animation when a new animation starts. Try quickly clicking the button below.

```js
const clicks = view(Inputs.button("Click", {label: "Run cell"}));
const colors = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0"];
const duration = 2000;
```

<canvas id="canvas1" width="640" height="30" style="max-width: 100%; height: 30px;"></canvas>

```js echo
const context1 = canvas1.getContext("2d");
const color = colors[clicks % 4]; // cycle through colors on click
const start = performance.now(); // when the animation started

let frame = requestAnimationFrame(function tick(now) {
  const t = Math.min(1, (now - start) / duration);
  context1.fillStyle = color;
  context1.fillRect(0, 0, t * canvas1.width, canvas1.height);
  if (t < 1) frame = requestAnimationFrame(tick);
});

invalidation.then(() => cancelAnimationFrame(frame));
```

## Visibility

The `visibility` function returns a promise that resolves when the code block’s display root is visible. This allows you to defer animation or computation until the content scrolls into view. If you missed the animation, try reloading the page and then scrolling down.

<canvas id="canvas2" width="640" height="30" style="max-width: 100%; height: 30px;"></canvas>

```js echo
await visibility(); // wait until this node is visible

const context2 = canvas2.getContext("2d");
const start = performance.now();

let frame = requestAnimationFrame(function tick(now) {
  const t = Math.min(1, (now - start) / duration);
  context2.fillStyle = "#a463f2";
  context2.fillRect(0, 0, t * canvas2.width, canvas2.height);
  if (t < 1) frame = requestAnimationFrame(tick);
});
```
