# Microsoft Excel (XLSX)

[`FileAttachment`](../javascript/files) supports the [Microsoft Excel Open XML format](https://en.wikipedia.org/wiki/Office_Open_XML) via the `file.xlsx` method. This is implemented using the MIT-licensed [ExcelJS](https://github.com/exceljs/exceljs) library.

```js echo
const workbook = FileAttachment("laser-report.xlsx").xlsx();
```

This returns a [promise](../javascript/promises) to a `Workbook` instance.

```js echo
workbook
```

The workbook’s sheet names are exposed as `workbook.sheetNames`.

```js echo
workbook.sheetNames
```

To load a sheet, call `workbook.sheet`, passing in a sheet name. You can also pass a **range** option to indicate which part of the sheet to materialize, such as `A:J` for columns A through J (inclusive) or `B4:K123` for column B, row 4 through column K, row 123. The **headers** option indicates whether to treat the first row of the given range as column names. If the **headers** option is false, the default, the returned object properties will reflect the column letters.

```js echo
const reports = workbook.sheet("Laser Report 2020", {range: "A:J", headers: true});
```

This returns an array of objects.

```js echo
reports
```

Each object represents a row, and each object property represents a cell value. Values may be represented as numbers, strings, booleans, Date objects, or [other values](https://github.com/exceljs/exceljs/blob/master/README.md#value-types). Row numbers are also exposed as a non-enumerable `#` property to assist with recognition and range specification.

We can display these objects using [`Inputs.table`](./inputs#table):

```js echo
Inputs.table(reports)
```

Or as a scatterplot using [`Plot.dot`](https://observablehq.com/plot/marks/dot):

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

Some additional details on values: dates are interpreted as UTC; formula results are included, but formula definitions ignored and formula errors are represented as `NaN`; hyperlinks are returned as strings, with a space between URL and text if they differ; empty rows are kept, but empty cells are skipped (row objects will lack properties for missing values).

If you’d prefer to use [ExcelJS](https://github.com/exceljs/exceljs) directly, you can import it like so:

```js run=false
import Excel from "npm:exceljs";
```
