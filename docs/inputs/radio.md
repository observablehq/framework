# Radio

The Radio input allows the user to choose one of a given set of values. (See [Checkbox](./checkbox) for multiple-choice.) A Radio is recommended over a [Select](./select) when the number of values to choose from is small — say, seven or fewer — because all choices will be visible up-front, improving usability.

```js echo
const color = view(Inputs.radio(["red", "green", "blue"], {label: "color"}))
```

```js echo
color
```

```html echo
<div style="background-color: ${color}; width: 25px; height: 25px;">
```

Note that a Radio cannot be cleared by the user once selected; if you wish to allow no selection, include null in the allowed values.

```js echo
const vote = view(Inputs.radio(["Yea", "Nay", null], {value: null, format: x => x ?? "Abstain"}))
```

```js echo
vote
```

A Radio’s values need not be strings: they can be anything. Specify a *format* function to control how these values are presented to the reader.

```js echo
const teams = [
  {name: "Lakers", location: "Los Angeles, California"},
  {name: "Warriors", location: "San Francisco, California"},
  {name: "Celtics", location: "Boston, Massachusetts"},
  {name: "Nets", location: "New York City, New York"},
  {name: "Raptors", location: "Toronto, Ontario"},
]
```

```js echo
const favorite = view(Inputs.radio(teams, {label: "Favorite team", format: x => x.name}))
```

```js echo
favorite
```

A Radio can be disabled by setting the *disabled* option to true. Alternatively, specific options can be disabled by passing an array of values to disable.

```js echo
const vowel = view(Inputs.radio([..."AEIOUY"], {label: "Vowel", disabled: ["Y"]}))
```

```js echo
vowel
```

The *format* function, like the *label*, can return either a text string or an HTML element. This allows extensive control over the appearance of the Radio, if desired.

```js echo
const color2 = view(Inputs.radio(["red", "green", "blue"], {value: "red", label: html`<b>Color</b>`, format: x => html`<span style="text-transform: capitalize; border-bottom: solid 2px ${x}; margin-bottom: -2px;">${x}`}))
```

```js echo
color2
```

If the Radio’s data are specified as a Map, the values will be the map’s values while the keys will be the displayed options. (This behavior can be customized by passing *keyof* and *valueof* function options.) Below, the displayed sizes are named, but the value is the corresponding number of fluid ounces.

```js echo
const size = view(Inputs.radio(new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]), {value: 12, label: "Size"}))
```

```js echo
size
```

Since the *format* function is passed elements from the data, it can access both the key and value from the corresponding Map entry.

```js echo
const size2 = view(Inputs.radio(
  new Map([["Short", 8], ["Tall", 12], ["Grande", 16], ["Venti", 20]]),
  {value: 12, label: "Size", format: ([name, value]) => `${name} (${value} oz)`}
))
```

```js echo
size2
```

[TODO] check okay to remove ref to Hello, Inputs below

[TODO] check if linking to d3-group notebook below is best

Passing a Map to Radio is especially useful in conjunction with [d3.group](https://observablehq.com/@d3/d3-group). For example, given a tabular dataset of Olympic athletes, we can use d3.group to group them by gold medal 🥇 count, and then Radio to select the athletes for the chosen count. 

```js echo
const athletes = FileAttachment("athletes.csv").csv({typed: true})
```

```js echo
const goldAthletes = view(Inputs.radio(d3.group(athletes, d => d.gold), {label: "Gold medal count", sort: "descending"}))
```

```js echo
goldAthletes
```

If the *sort* and *unique* options are specified, the Radio’s keys will be sorted and duplicate keys will be discarded, respectively. 

```js echo
const base = view(Inputs.radio("GATTACA", {sort: true, unique: true}))
```

```js echo
base
```








