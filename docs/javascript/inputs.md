# JavaScript: Inputs

You can use the built-in [`view` function](#view(input)) and an HTML input element to create a reactive input. For example, here is a slider:

```js echo
const gain = view(Inputs.range([0, 11], {value: 5, step: 0.1, label: "Gain"}));
```

Now you can reference the input’s value (here `gain`) anywhere. The code will run whenever the input changes; no event listeners required!

```md
The current gain is ${gain.toFixed(1)}!
```

The current gain is ${gain.toFixed(1)}!

## view(*input*)

As described above, this function [displays](./display) the given input element and then returns its corresponding [generator](./generators) via `Generators.input`. Use this to display an input element while also exposing the input’s value as a [reactive top-level variable](./reactivity).
