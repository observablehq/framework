# Table input

[TODO] check if removing Hello, Inputs okay.

A Table displays tabular data. It’s fast: rows are rendered lazily on scroll. It sorts: click a header to sort, and click again to reverse. And it selects: click a checkbox on any row, and the selected rows are exported as a view value. (And for searching, see the [Search input](./search).) 

By default, all columns are visible. Only the first dozen rows are initially visible, but you can scroll to see more. Column headers are fixed for readability.

```js echo
const penguins = FileAttachment("penguins.csv").csv({typed: true});
```

```js echo
Inputs.table(penguins)
```

To show a subset of columns, or to reorder them, pass an array of property names
as the _columns_ option. By default, columns are inferred from _data_.columns if
present, and otherwise by iterating over the data to union the property names.

The _header_ option lets you redefine the column title; this doesn’t change the
name used to reference the data.

```js echo
penguins.columns
```

```js echo
Inputs.table(penguins, {
  columns: [
    "species",
    "culmen_length_mm",
    "culmen_depth_mm",
    "flipper_length_mm"
  ],
  header: {
    species: "Penguin Species",
    culmen_length_mm: "Culmen length (mm)",
    flipper_length_mm: "Flipper length (mm)",
    culmen_depth_mm: "Culmen Depth (mm)"
  }
})
```

By default, rows are displayed in input order. You can change the order by
specifying the name of a column to _sort_ by, and optionally the _reverse_
option for descending order. The male Gentoo penguins are the largest in this
dataset, for example. Undefined values go to the end.

```js echo
Inputs.table(penguins, {sort: "body_mass_g", reverse: true})
```

[TODO] these use view() instead of viewof operator. Is update below correct? Just changes "using the viewof operator" to "using the view function" (and do we need to update intro to views in docs?)

Tables are [view-compatible](https://observablehq.com/@observablehq/views): using the
view function, you can use a table to select rows and refer to them from other
cells, say to chart a subset of the data. Click the checkbox on the left edge of
a row to select it, and click the checkbox in the header row to clear the
selection. You can shift-click to select a range of rows.

```js echo
const selection = view(Inputs.table(penguins, {required: false}));
```

```js echo
selection // Try selecting rows above!
```

The _required_ option determines the selection when no items are selected from
the table. If it is true (default), the selection contains the full dataset.
Otherwise, the selection is empty.

The table component assumes that all values in a given column are the same type,
and chooses a suitable formatter based on the first non-null value in each
column.

- Numbers are formatted using
  [_number_.toLocaleString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString);
- Dates are formatted in [ISO8601](https://en.wikipedia.org/wiki/ISO_8601);
- undefined and NaN values are empty;
- everything else is displayed as-is.

To override the default formatting, pass _format_ options for the desired
columns.

```js echo
Inputs.table(penguins, {
  format: {
    culmen_length_mm: x => x.toFixed(1),
    culmen_depth_mm: x => x.toFixed(1),
    sex: x => x === "MALE" ? "M" : x === "FEMALE" ? "F" : ""
  }
})
```

The _format_ function can return a text string or an HTML element.  
For example, this can be used to render inline visualizations such as bars or [sparklines](https://observablehq.com/@mbostock/covid-cases-by-state).

```js echo
Inputs.table(penguins, {
  format: {
    culmen_length_mm: sparkbar(d3.max(penguins, d => d.culmen_length_mm)),
    culmen_depth_mm: sparkbar(d3.max(penguins, d => d.culmen_depth_mm)),
    flipper_length_mm: sparkbar(d3.max(penguins, d => d.flipper_length_mm)),
    body_mass_g: sparkbar(d3.max(penguins, d => d.body_mass_g)),
    sex: x => x.toLowerCase()
  }
})
```

```js echo
function sparkbar(max) {
  return x => htl.html`<div style="
    background: lightblue;
    width: ${100 * x / max}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${x.toLocaleString("en")}`
}
```

There’s a similar _width_ option if you want to give certain columns specific
widths. The table component defaults to a fixed _layout_ if there are twelve or
fewer columns; this improves performance and avoids reflow when scrolling.

You can switch _layout_ to auto if you prefer sizing columns based on content.
This makes the columns widths resize with the data, which can cause the columns
to jump around as the user scrolls. A horizontal scroll bar is added if the
total width exceeds the table’s width.

Set _layout_ to fixed to pack all the columns into the width of the table.

The table’s width can be controlled by the _width_ option, in pixels. Individual
column widths can alternatively be defined by specifying an object with column
names as keys, and widths as values. Use the _maxWidth_ option if the sum of
column widths exceeds the desired table’s width.

The _align_ option allows to change the text-alignment of cells, which can be
right, left, or center; it defaults to right for numeric columns, and left for
everything else.

The _rows_ option indicates the number of rows to display; it defaults to 11.5.
The _height_ and _maxHeight_ options respectively set the height and maximum
height of the table, in pixels. The height defaults to (rows + 1) \* 22 - 1.

```js echo
Inputs.table(penguins, {
  width: {
    culmen_length_mm: 140,
    culmen_depth_mm: 140,
    flipper_length_mm: 140
  },
  align: {
    culmen_length_mm: "right",
    culmen_depth_mm: "center",
    flipper_length_mm: "left"
  },
  rows: 18,
  maxWidth: 840,
  multiple: false,
  layout: "fixed"
})
```

You can preselect some rows in the table by setting the _value_ option to an
array of references to the actual objects in your data.

For example, to preselect the first two items, you could write:

[TODO] eval: false option for JS code below?

```js echo
// { value: penguins.slice(0, 2)}
```

or, if you just want to preselect the rows 1, 3, 7 and 9:

```js echo
// { value: penguins.filter((_,i)=>  [1, 3, 7, 9].includes(i))}
```

The _multiple_ option allows multiple rows to be selected (defaults to true).
When false, only one row can be selected. To set the initial value in that case,
just reference the preselected object:

```js echo
// { multiple: false, value: penguins[4] }
```

```js echo
Inputs.table(penguins, {
  value: penguins.filter((_, i) => [1, 3, 7, 9].includes(i)),
  multiple: true
})
```

Thanks to [Ilyá Belsky](https://observablehq.com/@oluckyman) and [Brett Cooper](https://observablehq.com/@hellonearthis) for suggestions.