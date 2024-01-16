# Inputs

Inputs are user-interface elements that accept data from a user. In a data app, inputs might prompt a viewer to:

- Select a URL from a dropdown list so they can explore site traffic for a specific page
- Interactively subset a table of users by typing in a domain name
- Choose a date range to explore software downloads over a time period of interest

Inputs can be displayed using [displays](./display.md), which insert a passed DOM element directly into the page where a user can see and interact with it. For example, the radio input below prompts a user to select one from a series of values:

```js echo
const team = view(Inputs.radio(["Metropolis Meteors", "Rockford Peaches", "Bears"], {label: "Favorite team:", value: "Metropolis Meteors"}));
```

The input value (e.g. the outcome of a user action or entry, like making a selection in the radio input above) is represented as an async [generator](./gen) which, when declared as a [top-level reactive variable](./reactivity.md#top-level-variables), can be accessed anywhere in the page to display dynamic content. For example, below we reference `team` in an inline expression to update a statement. Select different teams in the radio input above to update the text.

```md
My favorite baseball team is the ${team}!
```

My favorite baseball team is the ${team}!

## view(*element*)

The `view` function used above serves two purposes: it displays the given DOM *element* then returns its corresponding value [generator](./generators.md), using [`Generators.input`](../lib/generators#input(element)) under the hood. Use `view` to display an input while also exposing the input’s value as a [reactive variable](./reactivity). You can reference the input’s value anywhere, and the code will run whenever the input changes.

The `view` function is not limited to Observable Inputs. For example, here is a simple range slider created with [html](../lib/htl):

```js echo
const topn = view(html`<input type=range step=1 min=1 max=15 value=10>`);
```

Now we can reference `topn` elsewhere, for example to control how many groups are displayed in a sorted bar chart: 

```js echo
Plot.plot({
  marginLeft: 50,
  marks: [
    Plot.barX(olympians, Plot.groupY({x: "count"}, {y: "nationality", sort: {y: "x", reverse: true, limit: topn}})),
    Plot.ruleX([0])
  ]
})
```

## Observable Inputs

The [Observable Inputs](../lib/inputs) library implements commonly used inputs — buttons, sliders, dropdowns, tables, and the like — as functions. Each input function returns an HTML element that emits *input* events for compatibility with [`view`](#viewelement) and [Generators.input](../lib/generators#inputelement). 

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

To visualize a column of data as a histogram, use the value of the select input with [Observable Plot](/@observablehq/plot).

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

### License

Observable Inputs are released under the [ISC license](https://github.com/observablehq/inputs/blob/main/LICENSE) and depend only on [Hypertext Literal](https://observablehq.com/@observablehq/htl), our tagged template literal for safely generating dynamic HTML. If you are interested in contributing or wish to report an issue, please see [our repository](https://github.com/observablehq/inputs). For recent changes, please see our [release notes](https://github.com/observablehq/inputs/releases).