# Radio input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#radio">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/checkbox.js">Source</a> · The radio input allows the user to choose one of a given set of values. (See the [checkbox](./checkbox) input for multiple-choice.) A radio is recommended over a [select](./select) input when the number of values to choose from is small — say, seven or fewer — because all choices will be visible up-front, improving usability.

```js echo
const color = view(Inputs.radio(["red", "green", "blue"], {label: "color"}));
```

```js echo
color
```

Note that a radio cannot be cleared by the user once selected; if you wish to allow no selection, include null in the allowed values.

```js echo
const vote = view(Inputs.radio(["Yea", "Nay", null], {value: null, format: (x) => x ?? "Abstain"}));
```

```js echo
vote
```

A radio’s values need not be strings: they can be anything. Specify a *format* function to control how these values are presented to the reader.

```js echo
const teams = [
  {name: "Lakers", location: "Los Angeles, California"},
  {name: "Warriors", location: "San Francisco, California"},
  {name: "Celtics", location: "Boston, Massachusetts"},
  {name: "Nets", location: "New York City, New York"},
  {name: "Raptors", location: "Toronto, Ontario"},
];
```

```js echo
const favorite = view(Inputs.radio(teams, {label: "Favorite team", format: x => x.name}));
```

```js echo
favorite
```

A radio can be disabled by setting the *disabled* option to true. Alternatively, specific options can be disabled by passing an array of values to disable.

```js echo
const vowel = view(Inputs.radio([..."AEIOUY"], {label: "Vowel", disabled: ["Y"]}));
```

```js echo
vowel
```

The *format* function, like the *label*, can return either a text string or an HTML element. This allows extensive control over the appearance of the radio, if desired.

```js echo
const color2 = view(
  Inputs.radio(["red", "green", "blue"], {
    value: "red",
    label: html`<b>Colors</b>`,
    format: (x) =>
      html`<span style="
          text-transform: capitalize;
          border-bottom: solid 2px ${x};
          margin-bottom: -2px;
        ">${x}</span>`
  })
);
```

```js echo
color2
```

If the radio’s data are specified as a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), the values will be the map’s values while the keys will be the displayed options. (This behavior can be customized by passing *keyof* and *valueof* function options.) Below, the displayed sizes are named, but the value is the corresponding number of fluid ounces.

```js echo
const size = view(
  Inputs.radio(
    new Map([
      ["Short", 8],
      ["Tall", 12],
      ["Grande", 16],
      ["Venti", 20]
    ]),
    {value: 12, label: "Size"}
  )
);
```

```js echo
size
```

Since the *format* function is passed elements from the data, it can access both the key and value from the corresponding Map entry.

```js echo
const size2 = view(
  Inputs.radio(
    new Map([
      ["Short", 8],
      ["Tall", 12],
      ["Grande", 16],
      ["Venti", 20]
    ]),
    {value: 12, label: "Size", format: ([name, value]) => `${name} (${value} oz)`}
  )
);
```

```js echo
size2
```

Passing a Map to radio is especially useful in conjunction with [d3.group](https://d3js.org/d3-array/group). For example, given a tabular dataset of Olympic athletes (`olympians`), we can use d3.group to group them by gold medal count, and then a radio input to select the athletes for the chosen count.

```js echo
const goldAthletes = view(
  Inputs.radio(
    d3.group(olympians, (d) => d.gold),
    {label: "Gold medal count", sort: "descending"}
  )
);
```

```js echo
goldAthletes
```

If the *sort* and *unique* options are specified, the radio’s keys will be sorted and duplicate keys will be discarded, respectively.

```js echo
const base = view(Inputs.radio("GATTACA", {sort: true, unique: true}));
```

```js echo
base
```

## Options

**Inputs.radio(*data*, *options*)**

The available radio input options are:

* *label* - a label; either a string or an HTML element
* *sort* - true, *ascending*, *descending*, or a comparator to sort keys; defaults to false
* *unique* - true to only show unique keys; defaults to false
* *locale* - the current locale; defaults to English
* *format* - a format function; defaults to [formatLocaleAuto](https://github.com/observablehq/inputs/blob/main/README.md#inputsformatlocaleautolocale) composed with *keyof*
* *keyof* - a function to return the key for the given element in *data*
* *valueof* - a function to return the value of the given element in *data*
* *value* - the initial value; defaults to null (no selection)
* *disabled* - whether input is disabled, or the disabled values; defaults to false
