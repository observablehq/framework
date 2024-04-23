# Observable Inputs

[Observable Inputs](https://github.com/observablehq/inputs) provides “lightweight interface components — buttons, sliders, dropdowns, tables, and the like — to help you explore data and build interactive displays.” Observable Inputs is available by default as `Inputs` in Markdown, but you can import it explicitly like so:

```js echo
import * as Inputs from "npm:@observablehq/inputs";
```

Or, just import the specific inputs you want:

```js echo
import {button, color} from "npm:@observablehq/inputs";
```

Inputs are typically passed to the [`view` function](<../reactivity#inputs>) for display, while exposing the input’s [value generator](../reactivity#generators) as a [reactive variable](../reactivity). Options differ between inputs. For example, the checkbox input accepts options to disable all or certain values, sort displayed values, and only display repeated values _once_ (among others):

```js echo
const checkout = view(
  Inputs.checkbox(["B", "A", "Z", "Z", "⚠️F", "D", "G", "G", "G", "⚠️Q"], {
    disabled: ["⚠️F", "⚠️Q"],
    sort: true,
    unique: true,
    value: "B",
    label: "Choose categories:"
  })
);
```

```js echo
checkout
```

To demonstrate Observable Inputs, let’s look at a sample dataset of athletes from the 2016 Rio olympics via [Matt Riggott](https://flother.is/2017/olympic-games-data/). Here’s a [table input](../inputs/table) — always a good starting point for an agnostic view of the data:

```js
const olympians = await d3.csv("https://static.observableusercontent.com/files/31ca24545a0603dce099d10ee89ee5ae72d29fa55e8fc7c9ffb5ded87ac83060d80f1d9e21f4ae8eb04c1e8940b7287d179fe8060d887fb1f055f430e210007c", (d) => (delete d.id, delete d.info, d3.autoType(d)));
```

```js echo
Inputs.table(olympians)
```

<div class="tip">Tables can be inputs, too! The value of the table is the subset of rows that you select using the checkboxes in the first column.</div>

Now let’s wire up the table to a [search input](../inputs/search). Type anything into the box and the search input will find the matching rows in the data. The value of the search input is the subset of rows that match the query.

A few examples to try: **[mal]** will match _sex_ = male, but also names that start with “mal”, such as Anna Malova; **[1986]** will match anyone born in 1986 (and a few other results); **[USA gym]** will match USA’s gymnastics team. Each space-separated term in your query is prefix-matched against all columns in the data.

```js echo
const searchResults = view(Inputs.search(olympians, {
  datalist: ["mal", "1986", "USA gym"],
  placeholder: "Search athletes"
}))
```

```js echo
Inputs.table(searchResults)
```

You can sort columns by clicking on the column name: click once to sort ascending, and click again to sort descending. Note that the sort order is temporary: it’ll go away if you reload the page. Specify the column name as the _sort_ option above if you want this order to persist.

For a more structured approach, we can use a select input to choose a sport, then _array_.filter to determine which rows are shown in the table. The _sort_ and _unique_ options tell the input to show only distinct values and to sort them alphabetically. Try comparing the **[gymnastics]** and **[basketball]** sports.

```js echo
const sport = view(
  Inputs.select(
    olympians.filter((d) => d.weight && d.height).map((d) => d.sport),
    {sort: true, unique: true, label: "sport"}
  )
);
```

```js echo
Plot.plot({
  title: `How ${sport} athletes compare`,
  marks: [
    Plot.dot(olympians, {x: "weight", y: "height"}),
    Plot.dot(olympians.filter((d) => d.sport === sport), {x: "weight", y: "height", stroke: "red"})
  ]
})
```

You can pass grouped data to a [select input](../inputs/select) as a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) from key to array of values, say using [d3.group](https://d3js.org/d3-array/group). The value of the select input in this mode is the data in the selected group. Note that _unique_ is no longer required, and that _sort_ works here, too, sorting the keys of the map returned by d3.group.

```js echo
const sportAthletes = view(
  Inputs.select(
    d3.group(olympians, (d) => d.sport),
    {sort: true, label: "sport"}
  )
);
```

```js echo
Inputs.table(sportAthletes)
```

The select input works well for categorical data, such as sports or nationalities, but how about quantitative dimensions such as height or weight? Here’s a [range input](../inputs/range) that lets you pick a target weight; we then filter the table rows for any athlete within 10% of the target weight. Notice that some columns, such as sport, are strongly correlated with weight.

```js echo
const weight = view(
  Inputs.range(
    d3.extent(olympians, (d) => d.weight),
    {step: 1, label: "weight (kg)"}
  )
);
```

```js echo
Inputs.table(
  olympians.filter((d) => d.weight < weight * 1.1 && weight * 0.9 < d.weight),
  {sort: "weight"}
)
```

For more, see the individual input pages:

- [Button](../inputs/button) - do something when a button is clicked
- [Toggle](../inputs/toggle) - toggle between two values (on or off)
- [Checkbox](../inputs/checkbox) - choose any from a set
- [Radio](../inputs/radio) - choose one from a set
- [Range](../inputs/range) or [Number](../inputs/range) - choose a number in a range (slider)
- [Select](../inputs/select) - choose one or any from a set (drop-down menu)
- [Text](../inputs/text) - enter freeform single-line text
- [Textarea](../inputs/textarea) - enter freeform multi-line text
- [Date](../inputs/date) or [Datetime](../inputs/date) - choose a date
- [Color](../inputs/color) - choose a color
- [File](../inputs/file) - choose a local file
- [Search](../inputs/search) - query a tabular dataset
- [Table](../inputs/table) - browse a tabular dataset
