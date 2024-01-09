# Color input

The Color input specifies an RGB color as a hexadecimal string `#rrggbb`. The initial value defaults to black (`#000000`) and can be specified with the *value* option.

```js echo
const color = view(Inputs.color({label: "Favorite color", value: "#4682b4"}));
```

```js echo
color
```

The color input is currently strict in regards to input: it does not accept any CSS color string. If you’d like greater flexibility, consider using D3 to parse colors and format them as hexadecimal.

```js echo
const fill = view(Inputs.color({label: "Fill", value: d3.color("steelblue").formatHex()}));
```

If you specify the *datalist* option as an array of hexadecimal color strings, the color picker will show this set of colors for convenient picking. (The user will still be allowed to pick another color, however; if you want to limit the choice to a specific set, then a radio or select input may be more appropriate.)

[TODO] update to the new Observable color palette?

```js echo
const stroke = view(Inputs.color({label: "Stroke", datalist: d3.schemeTableau10}));
```

```js echo
stroke
```

The *readonly* property is not supported for color inputs, but you can use the *disabled* option to prevent the input value from being changed.

```js echo
const disabled = view(Inputs.color({label: "Disabled", value: "#f28e2c", disabled: true}));
```

```js echo
disabled
```