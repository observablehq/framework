# JavaScript: Reactivity

TK Something about how this is nice for incremental updates during preview, but also simplifies your code when you build a static site.

You may be accustomed to code running sequentially from top to bottom, and manually evaluating code in a notebook; Observable is different: we use [dataflow](https://en.wikipedia.org/wiki/Dataflow_programming), as in a spreadsheet, to *automatically* run code in topological order as determined by [top-level variable](#top-level-variables) references. For example, here we reference variables `x` and `y` even though they are defined in a code block below:

```js echo
x + y
```

When code (such as `x + y`) references variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs after the *defining* code. Since code runs independently of its order on the page, giving you the flexibility to arrange your code however you like.

## Top-level variables

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```js echo
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively). Top-level variable declarations are effectively [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page, and code runs in topological rather than top-down document order. If multiple blocks define top-level variables with the same name, references to these variables will throw a duplicate definition error.

To prevent variables from being visible outside the current block, make them local with a block statement:

```js echo
{
  const z = 3;
}
```

## Invalidation

TK The `invalidation` promise.

```js
const clicks = view(Inputs.button("Click", {label: "Run cell"}));
const colors = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0"];
const duration = 2000;
```

<canvas id="canvas" width="640" height="30">

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

TK The `visibility` promise.

<canvas id="canvas2" width="640" height="30">

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
