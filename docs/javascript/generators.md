# JavaScript: Generators

Values that change over time, such as interactive inputs and animation parameters, can represented as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). When a top-level generator is declared, code in other blocks sees the generator’s latest yielded value and runs whenever the generator yields a new value.

<!-- TK Talk about how this is different than just using a `requestAnimationFrame` loop because you can write your animation more declaratively, and then maybe you can have a scrubber that controls the animation instead of being driven by time.
-->

For example, here is a generator that increments once a second:

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

If the generator is synchronous, the generator will yield every animation frame, which is typically 60 frames per second:

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

And here’s an HTML input element using [`Generators.input`](<../lib/generators#input(element)>):

```js echo
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

```js echo
name
```
