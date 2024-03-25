# Form input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#inputsforminputs-options">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/form.js">Source</a> · The form input combines a number of inputs into a single compound input. It’s intended for a more compact display of closely-related inputs, say for a color’s red, green, and blue channels.

```js echo
const rgb = view(Inputs.form([
  Inputs.range([0, 255], {step: 1, label: "r"}),
  Inputs.range([0, 255], {step: 1, label: "g"}),
  Inputs.range([0, 255], {step: 1, label: "b"})
]));
```

```js echo
rgb
```

You can pass either an array of inputs to Inputs.form, as shown above, or a simple object with enumerable properties whose values are inputs. In the latter case, the value of the form input is an object with the same structure whose values are the respective input’s value.

```js echo
const rgb2 = view(Inputs.form({
  r: Inputs.range([0, 255], {step: 1, label: "r"}),
  g: Inputs.range([0, 255], {step: 1, label: "g"}),
  b: Inputs.range([0, 255], {step: 1, label: "b"})
}));
```

```js echo
rgb2
```

## Options

**Inputs.form(*inputs*, *options*)**

The available form input options are:

* *template* - a function that takes the given *inputs* and returns an HTML element

If the *template* object is not specified, the given inputs are wrapped in a DIV.
