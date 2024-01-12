# Checkbox input

A Checkbox allows the user to choose any of a given set of values. (See [Radio](./radio) for single-choice.) A Checkbox is recommended over a [Select](./select) when the number of values to choose from is small — say, seven or fewer — because all choices will be visible up-front, improving usability. For zero or one choice, see [Toggle](./toggle).

The initial value of a Checkbox defaults to an empty array. You can override this by specifying the *value* option, which should also be an array (or iterable).

```js echo
const colors = view(Inputs.checkbox(["red", "green", "blue"], {label: "color"}));
```

```js echo
colors 
```

```html echo
<div style="display: flex;">${colors.map(color => html`<div style="background-color: ${color}; width: 25px; height: 25px;">`)}
```

A Checkbox’s values need not be strings: they can be anything. Specify a *format* function to control how these values are presented to the reader.

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
const watching = view(Inputs.checkbox(teams, {label: "Watching", format: x => x.name}));
```

```js echo
watching
```

A Checkbox can be disabled by setting the *disabled* option to true. Alternatively, specific options can be disabled by passing an array of values to disable.

```js echo
const vowels = view(Inputs.checkbox([..."AEIOUY"], {label: "Vowel", disabled: ["Y"]}));
```

```js echo
vowels
```

The *format* function, like the *label*, can return either a text string or an HTML element. This allows extensive control over the appearance of the Checkbox, if desired.

```js echo
const colors2 = view(Inputs.checkbox(["red", "green", "blue"], {value: ["red"], label: html`<b>Colors</b>`, format: x => html`<span style="text-transform: capitalize; border-bottom: solid 2px ${x}; margin-bottom: -2px;">${x}`}));
```

```js echo
colors2
```

If the Checkbox’s data are specified as a Map, the values will be the map’s values while the keys will be the displayed options. (This behavior can be customized by passing *keyof* and *valueof* function options.) Below, the displayed sizes are named, but the value is the corresponding number of fluid ounces.

```js echo
const sizes = view(Inputs.checkbox(new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]), {value: [12], label: "Size"}));
```

```js echo
sizes
```

Since the *format* function is passed elements from the data, it can access both the key and value from the corresponding Map entry.

```js echo
const size2 = view(Inputs.checkbox(
  new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]),
  {value: [12], label: "Size", format: ([name, value]) => `${name} (${value} oz)`}
));
```

```js echo
size2
```

<!--[TODO] check if okay, removed link to Hello, Inputs. -->

Passing a Map to Checkbox is especially useful in conjunction with [d3.group](https://observablehq.com/@d3/d3-group). For example, given a tabular dataset of Olympic athletes, we can use d3.group to group them by gold medal count, and then Checkbox to select the athletes for the chosen count. Note that the value of the Checkbox will be an array of arrays, since d3.group returns a Map from key to array; use [*array*.flat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) to merge these arrays if desired.

```js echo
const athletes = FileAttachment("athletes.csv").csv({typed: true});
```

```js echo
const goldAthletes = view(Inputs.checkbox(d3.group(athletes, d => d.gold), {label: "Gold medal count", sort: "descending", key: [4, 5]}));
```

```js echo
goldAthletes.flat()
```

If the *sort* and *unique* options are specified, the Checkbox’s keys will be sorted and duplicate keys will be discarded, respectively. 

```js echo
const bases = view(Inputs.checkbox("GATTACA", {sort: true, unique: true}));
```

```js echo
bases
```