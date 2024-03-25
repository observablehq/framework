---
keywords: dropdown
---

# Select input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#select">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/select.js">Source</a> · The select input allows the user to choose from a given set of values. A select is recommended over a [radio](./radio) or [checkbox](./checkbox) input when the number of values to choose from is large — say, eight or more — to save space.

The default appearance of a select is a drop-down menu that allows you to choose a single value. The initial value is the first of the allowed values, but you can override this by specifying the *value* option.

```js
const x11colors = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"];
```

```js echo
const color = view(Inputs.select(x11colors, {value: "steelblue", label: "Favorite color"}));
```

```js echo
color
```

If the *multiple* option is true, the select will allow multiple values to be selected and the value of the select will be the array of selected values. The initial value is the empty array. You can choose a range of values by dragging or Shift-clicking, and select or deselect a value by Command-clicking.

```js echo
const colors = view(Inputs.select(x11colors, {multiple: true, label: "Favorite colors"}));
```

```js echo
colors
```

The *multiple* option can also be a number indicating the desired size: the number of rows to show. If *multiple* is true, the size defaults to the number of allowed values, or ten, whichever is fewer.

```js echo
const fewerColors = view(Inputs.select(x11colors, {multiple: 4, label: "Favorite colors"}));
```

```js echo
fewerColors
```

For single-choice selects, if you wish to allow no choice to be selected, we recommend including null as an explicit option.

```js echo
const maybeColor = view(Inputs.select([null].concat(x11colors), {label: "Favorite color"}));
```

```js echo
maybeColor
```

A select’s values need not be strings: they can be anything. Specify a *format* function to control how these values are presented to the reader.

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
const favorite = view(
  Inputs.select(teams, {
    label: "Favorite team",
    format: (t) => t.name,
    value: teams.find((t) => t.name === "Warriors")
  })
);
```

```js echo
favorite
```

If the select’s data are specified as a Map, the values will be the map’s values while the keys will be the displayed options. (This behavior can be customized by passing *keyof* and *valueof* function options.) Below, the displayed sizes are named, but the value is the corresponding number of fluid ounces.

```js echo
const size = view(
  Inputs.select(
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
  Inputs.select(
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

Passing a Map to select is especially useful in conjunction with [d3.group](https://d3js.org/d3-array/group). For example, given a tabular dataset of Olympic athletes (`olympians`), we can use d3.group to group them by sport, and then the select input to select only athletes for the chosen sport.

```js echo
const sportAthletes = view(
  Inputs.select(
    d3.group(olympians, (d) => d.sport),
    {label: "Sport"}
  )
);
```

```js echo
sportAthletes
```

If the *sort* and *unique* options are specified, the select’s keys will be sorted and duplicate keys will be discarded, respectively.

```js echo
const sport = view(
  Inputs.select(
    olympians.map((d) => d.sport),
    {label: "Sport", sort: true, unique: true}
  )
);
```

```js echo
sport
```

The *disabled* option, if true, disables the entire select. If *disabled* is an array, then only the specified values are disabled.

```js echo
Inputs.select(["A", "E", "I", "O", "U", "Y"], {label: "Vowel", disabled: true})
```

```js echo
Inputs.select(["A", "E", "I", "O", "U", "Y"], {label: "Vowel", disabled: ["Y"]})
```

## Options

**Inputs.select(*data*, *options*)**

The available select input options are:

* *label* - a label; either a string or an HTML element
* *multiple* - whether to allow multiple choice; defaults to false
* *size* - if *multiple* is true, the number of options to show
* *sort* - true, *ascending*, *descending*, or a comparator to sort keys; defaults to false
* *unique* - true to only show unique keys; defaults to false
* *locale* - the current locale; defaults to English
* *format* - a format function; defaults to [formatLocaleAuto](https://github.com/observablehq/inputs/blob/main/README.md#inputsformatlocaleautolocale) composed with *keyof*
* *keyof* - a function to return the key for the given element in *data*
* *valueof* - a function to return the value of the given element in *data*
* *value* - the initial value, an array if multiple choice is allowed
* *width* - the width of the input (not including the label)
* *disabled* - whether input is disabled, or the disabled values; defaults to false
