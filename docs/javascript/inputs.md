# Inputs

Observable Inputs are lightweight interface components — buttons, sliders, dropdowns, tables, and the like — that help you explore data and build interactive displays. 

For example, here is a Radio component that prompts a user to select one from a series of values:

```js echo
const team = view(Inputs.radio(["Metropolis Meteors", "Rockford Peaches", "Bears"], {label: "Favorite team:", value: "Metropolis Meteors"}));
```

Thanks to the [`view()` function](#viewelement), the input value can be referenced anywhere on a page to update displays (charts, tables, text, and more) based on user selections or entries. 

Below we reference `team` in an inline expression to update a statement. Select different teams in the radio input above to update the text.

```md
My favorite baseball team is the ${team}!
```

My favorite baseball team is the ${team}!

## view(*element*)

The `view` function displays the given DOM *element* then returns its corresponding value [generator](./generators.md) via [`Generators.input`](../lib/generators#input(element)). Use `view` to display an input while also exposing the input’s value as a [reactive variable](./reactivity). You can reference the input’s value anywhere, and the code will run whenever the input changes; no event listeners required. 

The `view` function is not limited to use with Observable Inputs. For example, here is a simple HTML slider:

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

## Usage

Inputs are generally declared as follows: 

```js run=false
const value = view(Inputs.inputName(...));
```

where *value* is the named input value, and *inputName* is the component name (like `radio`, `button`, or `checkbox`). See the full list of [available inputs](../lib/inputs) with live examples, or visit our [Observable Inputs API reference](https://github.com/observablehq/inputs/blob/main/README.md) for more detail and specific input options.

Options differ between inputs. For example, the Checkbox component accepts options to disable all or certain values, sort displayed values, and only display repeated values *once* (among others):

```js echo
const checkout = view(Inputs.checkbox(["B","A","Z","Z","F","D","G","G","G","Q"], {disabled: ["F", "Q"], sort: true, unique: true, value: "B", label: "Choose categories:"}));
```

```js echo
checkout
```

## Analysis with Observable Inputs

To demonstrate Observable Inputs for data analysis, let’s attach and simplify a CSV dataset of athletes that participated in the 2016 Rio olympics (from [Matt Riggott](https://flother.is/2017/olympic-games-data/)).

```js echo
const athletes = await FileAttachment("athletes.csv").csv({typed: true});
const columns = athletes.columns.slice(1, -1); // hide the id and info column to simplify
```

Now let’s wire up our data to a Search box. Type whatever you want into the box and Search will find matching rows in the data which we can then pipe to a Table below.

A few examples to try: **[mal]** will match *sex* = male, but also names that start with “mal”, such as Anna Malova; **[1986]** will match anyone born in 1986 (and a few other results); **[USA gym]** will match USA’s gymnastics team. Each space-separated term in your query is prefix-matched against all columns in the data.

```js echo
const search = view(Inputs.search(athletes, {
  datalist: ["mal", "1986", "USA gym"], 
  placeholder: "Search athletes"
}))
```

```js echo
Inputs.table(search, {columns})
```

If you like, you can sort the table columns by clicking on the column name. Click once to sort ascending, and click again to sort descending. Note that the sort order is temporary: it’ll go away if you reload the page. Specify the column name as the *sort* option above if you want this order to persist.

For a more structured approach, we can use a Select component to chose a sport, then *array*.filter to determine which rows are shown in the table. The *sort* and *unique* options tell Select to show only distinct values and to sort them alphabetically.

```js echo
const sport = view(Inputs.select(athletes.map(d => d.sport), {sort: true, unique: true, label: "sport"}));
```

```js echo
const selectedAthletes = display(athletes.filter(d => d.sport === sport));
```

```js echo
Inputs.table(selectedAthletes, {columns})
```

To visualize a column of data as a histogram, pipe the output of the Select to [Observable Plot](/@observablehq/plot).

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

You can also pass grouped data to Select as a Map from key to array of values, say using d3.group. The value of the Select component in this mode is the data in the selected group. Note that *unique* is no longer required, and that *sort* works here, too, sorting the keys of the map returned by d3.group.

```js echo
const groups = display(d3.group(athletes, d => d.sport));
```

```js echo
const sportAthletes = view(Inputs.select(groups, {sort: true, label: "sport"}));
```

```js echo
Inputs.table(sportAthletes, {columns})
```

Select works well for categorical data, such as sports or nationalities, but how about quantitative dimensions such as height or weight? Here’s a Range component that lets you pick a target weight; we then filter the table rows for any athlete within 10% of the target weight. Notice that some columns, such as sport, are strongly correlated with weight.

```js echo
const weight = view(Inputs.range(d3.extent(athletes, d => d.weight), {step: 1, label: "weight (kg)"}));
```

```js echo
Inputs.table(athletes.filter(d => d.weight < weight * 1.1 && weight * 0.9 < d.weight), {sort: "weight", columns})
```

## License

Observable Inputs are released under the [ISC license](https://github.com/observablehq/inputs/blob/main/LICENSE) and depend only on [Hypertext Literal](https://observablehq.com/@observablehq/htl), our tagged template literal for safely generating dynamic HTML. If you are interested in contributing or wish to report an issue, please see [our repository](https://github.com/observablehq/inputs). For recent changes, please see our [release notes](https://github.com/observablehq/inputs/releases).