# Select input

The Select input allows the user to choose from a given set of values. A Select is recommended over a [Radio](./radio) or a [Checkbox](./checkbox) when the number of values to choose from is large — say, eight or more — to save space.

The default appearance of a Select is a drop-down menu that allows you to choose a single value. The initial value is the first of the allowed values, but you can override this by specifying the *value* option.

```js
const x11colors = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"];
```

```js echo
const color = view(Inputs.select(x11colors, {value: "steelblue", label: "Favorite color"}));
```

```js echo
color
```

```html echo
<div style="background: ${color}; width: 25px; height: 25px;">
```

If the *multiple* option is true, the Select will allow multiple values to be selected and the value of the Select will be the array of selected values. The initial value is the empty array. You can select a range of values by dragging or Shift-clicking, and select or deselect a value by Command-clicking.

```js echo
const colors = view(Inputs.select(x11colors, {multiple: true, label: "Favorite colors"}));
```

```js echo
colors
```

```html echo
<div style="display: flex; flex-wrap: wrap; font: 13px/1 var(--sans-serif);">${colors.map(color => html`<div style="background: ${color}; padding: 0.5em;">${color}`)}
```

The *multiple* option can also be a number indicating the desired size: the number of rows to show. If *multiple* is true, the size defaults to the number of allowed values, or ten, whichever is fewer.

```js echo
const fewerColors = view(Inputs.select(x11colors, {multiple: 4, label: "Favorite colors"}));
```

For single-choice Selects, if you wish to allow no choice to be selected, we recommend including null as an explicit option.

```js echo
const maybeColor = view(Inputs.select([null].concat(x11colors), {label: "Favorite color"}));
```

```js echo
maybeColor
```

A Select’s values need not be strings: they can be anything. Specify a *format* function to control how these values are presented to the reader.

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
const favorite = view(Inputs.select(teams, {label: "Favorite team", format: x => x.name, value: teams.find(t => t.name === "Warriors")}));
```

```js echo
favorite
```

If the Select’s data are specified as a Map, the values will be the map’s values while the keys will be the displayed options. (This behavior can be customized by passing *keyof* and *valueof* function options.) Below, the displayed sizes are named, but the value is the corresponding number of fluid ounces.

```js echo
const size = view(Inputs.select(new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]), {value: 12, label: "Size"}));
```

```js echo
size
```

Since the *format* function is passed elements from the data, it can access both the key and value from the corresponding Map entry.

```js echo
const size2 = view(Inputs.select(new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]), {value: 12, label: "Size", format: ([name, value]) => `${name} (${value} oz)`}));
```

```js echo
size2
```

<!-- [TODO] check if removing Hello, Inputs okay. -->

<!-- [TODO] check if pointing to d3-group notebook is best. -->

Passing a Map to Select is especially useful in conjunction with [d3.group](https://observablehq.com/@d3/d3-group). For example, given a tabular dataset of Olympic athletes, we can use d3.group to group them by sport, and then Select to select the athletes for the chosen sport.

```js echo
const athletes = FileAttachment("athletes.csv").csv({typed: true});
```

```js echo
const sportAthletes = view(Inputs.select(d3.group(athletes, d => d.sport), {label: "Sport"}));
```

```js echo
sportAthletes
```

If the *sort* and *unique* options are specified, the Select’s keys will be sorted and duplicate keys will be discarded, respectively. 

```js echo
const sport = view(Inputs.select(athletes.map(d => d.sport), {label: "Sport", sort: true, unique: true}));
```

```js echo
sport
```

The *disabled* option, if true, disables the entire Select. If *disabled* is an array, then only the specified values are disabled.

```js echo
Inputs.select(["A", "E", "I", "O", "U", "Y"], {label: "Vowel", disabled: true})
```

```js echo
Inputs.select(["A", "E", "I", "O", "U", "Y"], {label: "Vowel", disabled: ["Y"]})
```









