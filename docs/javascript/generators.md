# Generators

When code refers to a [generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) defined in another code block, the referencing code automatically runs each time the generator yields a value. Values that change over time, such as interactive inputs and animation parameters, are often represented as generators. For example, you can use [Observable Inputs](https://github.com/observablehq/inputs) and the built-in [`view` function](#view(input)) to construct a live text input. Try entering your name into the box below:

```js show
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name"}));
```

Name is: ${name}.

The `view` function calls `Generators.input` under the hood, which takes an input element and returns a generator that yields the input’s value whenever it changes. The code above can be written more explicitly as:

```js no-run
const nameInput = Inputs.text({label: "Name", placeholder: "Enter your name"});
const name = Generators.input(nameInput);

display(nameInput);
```

As another example, you can use the built-in `Generators.observe` to represent the current pointer coordinates:

```js show
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.
