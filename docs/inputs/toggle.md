# Toggle input

A Toggle allows the user to choose one of two values, representing on or off. A Toggle is a specialized form of [Checkbox](./checkbox).

The initial value of a Toggle defaults to false. You can override this by specifying the *value* option.

```js echo
const  mute = view(Inputs.toggle({label: "Mute", value: true}));
```

```js echo
mute
```

The on and off values of a Toggle can be changed with the *values* option which defaults to [true, false].

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

A Toggle can be disabled to prevent its value from being changed.

```js echo
const frozen = view(Inputs.toggle({label: "Frozen", value: true, disabled: true}));
```

```js echo
frozen
```