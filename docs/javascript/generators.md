# JavaScript: Generators

Values that change over time, such as interactive inputs and animation parameters, can represented as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). When a top-level generator is declared, code in other blocks sees the generator’s latest yielded value and runs whenever the generator yields a new value.

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

As another example, you can use the built-in `Generators.observe` to represent the current pointer coordinates:

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

An HTML input element and `Generators.input`:

```js echo
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

Name is: ${name}.

See the [`view` function](./display) for shorthand inputs.

## Built-in generators

The Observable standard library includes several generator utilities. These are available by default in Markdown as `Generators`, but you can import them explicitly:

```js echo
import {Generators} from "npm:@observablehq/stdlib";
```

### Generators.input(*element*)

Returns an async generator that yields whenever the given *element* emits an *input* event, with the given *element*’s current value. (It’s a bit fancier than that because we special-case a few element types.) The built-in [`view` function](./display) uses this.

```js run=false
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

### Generators.observe(*change*)

Returns an async generator that yields whenever the callback function *change* is called, with the value passed.

```js run=false
const x = Generators.observe((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  return () => removeEventListener("hashchange", changed);
});
```

### Generators.queue(*change*)

Returns an async generator that yields whenever the callback function *change* is called, with the value passed. This is identical to Generators.observe, except that if *change* is called multiple times before the consumer has a chance to process the yielded result, values will not be dropped; use this if you require that the consumer not miss a yielded value.

```js run=false
const x = Generators.queue((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  return () => removeEventListener("hashchange", changed);
});
```

### Generators.now()

Returns a generator that repeatedly yields `Date.now()`, forever. This generator is available by default as `now` in Markdown.

```js run=false
const now = Generators.now();
```

### Generators.width(*element*)

Returns an async generator that yields the width of the given target *element*. Using a [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), the generator will yield whenever the width of the *element* changes. This generator for the `main` element is available by default as `width` in Markdown.

```js run=false
const width = Generators.width(document.querySelector("main"));
```
