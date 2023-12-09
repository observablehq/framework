# JavaScript: Generators

Values that change over time, such as interactive inputs and animation parameters, can represented as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). When a top-level generator is declared, code in other blocks sees the generator’s latest yielded value and runs whenever the generator yields a new value.

TK Talk about how this is different than just using a `requestAnimationFrame` loop because you can write your animation more declaratively, and then maybe you can have a scrubber that controls the animation instead of being driven by time.

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

If the generator is synchronous, the generator will yield every animation frame, which is typically 60 frames per second:

```js echo
const i = (function* () {
  for (let i = 0; true; ++i) {
    yield i;
  }
})();
```

The value of i is: ${i}.

As another example, you can use the built-in [`Generators.observe`](<../lib/generators#generators.observe(change)>) to represent the current pointer coordinates:

```js echo
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.

Here is a WebSocket that lists for Blockchain transactions:

```js echo
const socket = new WebSocket("wss://ws.blockchain.info/inv");
invalidation.then(() => socket.close());
socket.addEventListener("open", () => socket.send(JSON.stringify({op: "unconfirmed_sub"})));
const messages = Generators.observe((notify) => {
  const messages = [];
  const messaged = (event) => {
    messages.unshift(JSON.parse(event.data));
    if (messages.length > 30) {
      messages.pop();
      socket.close();
    }
    notify(messages.slice());
  };
  socket.addEventListener("message", messaged);
  return () => socket.removeEventListener("message", messaged);
});
```

```js
Inputs.table(
  messages.map((d) => ({
    time: new Date(d.x.time * 1000),
    hash: d.x.hash,
    ins: d3.sum(d.x.inputs.map((d) => d.prev_out.value)) / 1e8,
    outs: d3.sum(d.x.out.map((d) => d.value)) / 1e8
  }))
)
```

An HTML input element and [`Generators.input`](<../lib/generators#generators.input(element)>):

```js echo
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

Name is: ${name}.

See the [`view` function](./display) for shorthand inputs.
