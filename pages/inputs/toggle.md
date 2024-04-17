# Toggle input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#toggle">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/checkbox.js">Source</a> · The toggle input allows the user to choose one of two values, representing on or off. It is a specialized form of the [checkbox input](./checkbox).

The initial value of a toggle defaults to false. You can override this by specifying the *value* option.

```js echo
const  mute = view(Inputs.toggle({label: "Mute", value: true}));
```

```js echo
mute
```

The on and off values of a toggle can be changed with the *values* option which defaults to [true, false].

```js echo
const binary = view(Inputs.toggle({label: "Binary", values: [1, 0]}));
```

```js echo
binary
```

The *label* can be either a text string or an HTML element. This allows more control over the label’s appearance, if desired.

```js echo
const fancy = view(Inputs.toggle({label: html`<b>Fancy</b>`}));
```

```js echo
fancy
```

A toggle can be disabled to prevent its value from being changed.

```js echo
const frozen = view(Inputs.toggle({label: "Frozen", value: true, disabled: true}));
```

```js echo
frozen
```

## Options

**Inputs.toggle(*options*)**

The available toggle input options are:

* *label* - a label; either a string or an HTML element
* *values* - the two values to toggle between; defaults to [true, false]
* *value* - the initial value; defaults to the second value (false)
* *disabled* - whether input is disabled; defaults to false
