# JavaScript: Generators

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

Here is a WebSocket that listens for Blockchain transactions:

```js echo
const socket = new WebSocket("wss://ws.blockchain.info/inv");
invalidation.then(() => socket.close());
socket.addEventListener("open", () => socket.send(JSON.stringify({op: "unconfirmed_sub"})));
const message = Generators.observe((change) => {
  const messaged = (event) => change(JSON.parse(event.data));
  socket.addEventListener("message", messaged);
  return () => socket.removeEventListener("message", messaged);
});
```

```js echo
message.x // the most recently reported transaction
```
