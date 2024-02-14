# Observable Inputs

Observable Inputs implements commonly used inputs — buttons, sliders, dropdowns, tables, and the like — as functions. Each input function returns an HTML element that emits *input* events for compatibility with [`view`](#view(element)) and [Generators.input](../lib/generators#input(element)).

[Observable Inputs](https://github.com/observablehq/inputs) provides “lightweight interface components — buttons, sliders, dropdowns, tables, and the like — to help you explore data and build interactive displays.” Observable Inputs is available by default as `Inputs` in Markdown, but you can import it explicitly like so:

```js echo
import * as Inputs from "npm:@observablehq/inputs";
```

Or, just import the specific inputs you want:

```js echo
import {Button, Color} from "npm:@observablehq/inputs";
```

### Usage

Inputs are generally declared as follows:

```js run=false
const value = view(Inputs.inputName(...));
```

where *value* is the named input value, and *inputName* is the input name (like `radio`, `button`, or `checkbox`). See the full list of [available inputs](../lib/inputs) with live examples, or visit the [Observable Inputs API reference](https://github.com/observablehq/inputs/blob/main/README.md) for more detail and specific input options.

Options differ between inputs. For example, the checkbox input accepts options to disable all or certain values, sort displayed values, and only display repeated values *once* (among others):

```js echo
const checkout = view(Inputs.checkbox(["B","A","Z","Z","F","D","G","G","G","Q"], {disabled: ["F", "Q"], sort: true, unique: true, value: "B", label: "Choose categories:"}));
```

```js echo
checkout
```

### Analysis with Observable Inputs

To demonstrate Observable Inputs for data analysis, we’ll use the `olympians` sample dataset containing records on athletes that participated in the 2016 Rio olympics (from [Matt Riggott](https://flother.is/2017/olympic-games-data/)).

```js echo
Inputs.table(olympians)
```

Here, we create a subset of columns to simplify outputs:

```js echo
const columns = olympians.columns.slice(1, -1); // hide the id and info column to simplify
```

Now let’s wire up our data to a search input. Type whatever you want into the box and search will find matching rows in the data which we can then use in a table below.

A few examples to try: **[mal]** will match *sex* = male, but also names that start with “mal”, such as Anna Malova; **[1986]** will match anyone born in 1986 (and a few other results); **[USA gym]** will match USA’s gymnastics team. Each space-separated term in your query is prefix-matched against all columns in the data.

```js echo
const search = view(Inputs.search(olympians, {
  datalist: ["mal", "1986", "USA gym"],
  placeholder: "Search athletes"
}))
```

```js echo
Inputs.table(search, {columns})
```

If you like, you can sort the table columns by clicking on the column name. Click once to sort ascending, and click again to sort descending. Note that the sort order is temporary: it’ll go away if you reload the page. Specify the column name as the *sort* option above if you want this order to persist.

For a more structured approach, we can use a select input to choose a sport, then *array*.filter to determine which rows are shown in the table. The *sort* and *unique* options tell the input to show only distinct values and to sort them alphabetically.

```js echo
const sport = view(Inputs.select(olympians.map(d => d.sport), {sort: true, unique: true, label: "sport"}));
```

```js echo
const selectedAthletes = display(olympians.filter(d => d.sport === sport));
```

```js echo
Inputs.table(selectedAthletes, {columns})
```

To visualize a column of data as a histogram, use the value of the select input with [Observable Plot](https://observablehq.com/plot/).

```js echo
Plot.plot({
  x: {
    domain: [1.3, 2.2]
  },
  marks: [
    Plot.rectY(selectedAthletes, Plot.binX({y: "count"}, {x: "height", fill: "steelblue"})),
    Plot.ruleY([0])
  ]
})
```

You can also pass grouped data to the select input as a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) from key to array of values, say using [d3.group](https://d3js.org/d3-array/group). The value of the select input in this mode is the data in the selected group. Note that *unique* is no longer required, and that *sort* works here, too, sorting the keys of the map returned by d3.group.

```js echo
const groups = display(d3.group(olympians, d => d.sport));
```

```js echo
const sportAthletes = view(Inputs.select(groups, {sort: true, label: "sport"}));
```

```js echo
Inputs.table(sportAthletes, {columns})
```

The select input works well for categorical data, such as sports or nationalities, but how about quantitative dimensions such as height or weight? Here’s a range input that lets you pick a target weight; we then filter the table rows for any athlete within 10% of the target weight. Notice that some columns, such as sport, are strongly correlated with weight.

```js echo
const weight = view(Inputs.range(d3.extent(olympians, d => d.weight), {step: 1, label: "weight (kg)"}));
```

```js echo
Inputs.table(olympians.filter(d => d.weight < weight * 1.1 && weight * 0.9 < d.weight), {sort: "weight", columns})
```

## Basic inputs

These basic inputs will get you started.

* [Button](#button) - do something when a button is clicked
* [Toggle](#toggle) - toggle between two values (on or off)
* [Checkbox](#checkbox) - choose any from a set
* [Radio](#radio) - choose one from a set
* [Range](#range) or [Number](https://observablehq.com/@observablehq/input-range) - choose a number in a range (slider)
* [Select](#select) - choose one or any from a set (drop-down menu)
* [Text](#text) - enter freeform single-line text
* [Textarea](#textarea) - enter freeform multi-line text
* [Date](#date) or [Datetime](https://observablehq.com/@observablehq/input-date) - choose a date
* [Color](#color) - choose a color
* [File](#file) - choose a local file

These fancy inputs are designed to work with tabular data such as CSV or TSV [file attachments](./files).

* [Search](#search) - query a tabular dataset
* [Table](#table) - browse a tabular dataset

---

### Button

Do something when a button is clicked. [Examples ›](https://observablehq.com/@observablehq/input-button) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#button)

```js echo
const clicks = view(Inputs.button("Click me"));
```

```js
clicks
```

---

### Toggle

Toggle between two values (on or off). [Examples ›](https://observablehq.com/@observablehq/input-toggle) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#toggle)

```js echo
const mute = view(Inputs.toggle({label: "Mute"}));
```

```js
mute
```

---

### Checkbox

Choose any from a set. [Examples ›](https://observablehq.com/@observablehq/input-checkbox) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#checkbox)

```js echo
const flavors = view(Inputs.checkbox(["salty", "sweet", "bitter", "sour", "umami"], {label: "Flavors"}));
```

```js
flavors
```

---

### Radio

Choose one from a set. [Examples ›](https://observablehq.com/@observablehq/input-radio) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#radio)

```js echo
const flavor = view(Inputs.radio(["salty", "sweet", "bitter", "sour", "umami"], {label: "Flavor"}));
```

```js
flavor
```

---

### Range

Pick a number. [Examples ›](https://observablehq.com/@observablehq/input-range) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#range)

```js echo
const n = view(Inputs.range([0, 255], {step: 1, label: "Favorite number"}));
```

```js
n
```

---

### Select

Choose one, or any, from a menu. [Examples ›](https://observablehq.com/@observablehq/input-select) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#select)

```js
const capitals = FileAttachment("us-state-capitals.tsv").tsv({typed: true});
const stateNames = capitals.then((capitals) => capitals.map(d => d.State));
```

```js echo
const homeState = view(Inputs.select([null].concat(stateNames), {label: "Home state"}));
```

```js
homeState
```

```js echo
const visitedStates = view(Inputs.select(stateNames, {label: "Visited states", multiple: true}));
```

```js
visitedStates
```

---

### Text

Enter freeform single-line text. [Examples ›](https://observablehq.com/@observablehq/input-text) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#text)

```js echo
const name = view(Inputs.text({label: "Name", placeholder: "What’s your name?"}));
```

```js
name
```

---

### Textarea

Enter freeform multi-line text. [Examples ›](https://observablehq.com/@observablehq/input-textarea) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#textarea)

```js echo
const bio = view(Inputs.textarea({label: "Biography", placeholder: "What’s your story?"}));
```

```js
bio
```

---

### Date

Choose a date, or a date and time. [Examples ›](https://observablehq.com/@observablehq/input-date) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#date)

```js echo
const birthday = view(Inputs.date({label: "Birthday"}));
```

```js
birthday
```

---

### Color

Choose a color. [Examples ›](https://observablehq.com/@observablehq/input-color) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#color)

```js echo
const color = view(Inputs.color({label: "Favorite color", value: "#4682b4"}));
```

```js
color
```

---

### File

Choose a local file. [Examples ›](https://observablehq.com/@observablehq/input-file) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#file)

```js echo
const file = view(Inputs.file({label: "CSV file", accept: ".csv", required: true}));
```

Once a file has been selected, you can read its contents like so:

```js echo
const data = display(await file.csv({typed: true}));
```

---

### Search

Query a tabular dataset. [Examples ›](https://observablehq.com/@observablehq/input-search) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#search)

```js echo
const search = view(Inputs.search(capitals, {placeholder: "Search U.S. capitals"}));
```

```js
search // see table below!
```

---

### Table

Browse a tabular dataset. [Examples ›](https://observablehq.com/@observablehq/input-table) [API Reference ›](https://github.com/observablehq/inputs/blob/main/README.md#table)

```js echo
const rows = view(Inputs.table(search));
```

```js
rows // click a checkbox in the leftmost column
```

---

<!-- TK [Form](https://observablehq.com/@observablehq/input-form?collection=@observablehq/inputs) - combine multiple inputs for a compact display
-->
