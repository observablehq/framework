# JavaScript: Reactivity

Observable Framework uses the open-source [Observable Runtime](https://github.com/observablehq/runtime) to run JavaScript in Markdown reactively: in topological order as determined by [top-level variable](#top-level-variables) references, as in a spreadsheet. For example, here we reference variables `x` and `y` even though they are defined in a code block below:

```js echo
x + y
```

When code (such as `x + y`) references top-level variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs after the *defining* code. Since code runs independently of its order on the page, giving you the flexibility to arrange your code however you like.

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
