# XLSX

The [`FileAttachment`](../javascript/files) class supports reading the Microsoft Excel Open XML Format Spreadsheet file format using the `file.xlsx` method. This is implemented using the MIT-licensed [ExcelJS](https://github.com/exceljs/exceljs) library.

```js echo
const workbook = FileAttachment("laser-report.xlsx").xlsx();
```

This returns a [promise](../javascript/promises) to a `Workbook` instance.

```js echo
workbook
```

To load a sheet, call `workbook.sheet`. You can optionally pass in a range indicating which part of the sheet to materialize, and whether to treat the first row of the given range as the header row. (If the header option is false, the default, the return object properties will reflect the column letters.)

```js echo
const reports = workbook.sheet("Laser Report 2020", {range: "A:J", headers: true});
```

This returns an array of objects.

```js echo
reports
```

We can display these objects using [Inputs.table](./inputs#table):

```js echo
Inputs.table(reports)
```

Or as a scatterplot using [Plot.dot](https://observablehq.com/plot/marks/dot):

```js echo
Plot.plot({
  y: {
    label: "Altitude (feet, thousands)",
    domain: [0, 100],
    transform: (y) => y / 1000,
    grid: true,
    clamp: true
  },
  marks: [
    Plot.ruleY([0]),
    Plot.dot(reports, {x: "Incident Date", y: "Altitude", r: 1, stroke: "Incident Time", tip: true})
  ]
})
```

The objects’ values represent the cell values. Values are coerced to their corresponding JavaScript types: numbers, strings, Date objects (dates are interpreted in UTC).

Formula results are included, but formula definitions ignored. Formula errors are coerced to `NaN`.

Hyperlinks are returned as strings, with a space between URL and text if they differ. Empty cells are skipped: objects will not include fields or values for them, but empty rows are kept. Row numbers from the source sheet are included as a non-enumerable `"#"` property to assist with recognition and range specification.
