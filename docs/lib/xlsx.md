# Microsoft Excel (XLSX)

The `file.xlsx()` method uses [ExcelJS](https://github.com/exceljs/exceljs) to load a spreadsheet’s _values_ (not the formulae) into arrays of objects. It works in two stages: in the first stage, you load the spreadsheet, which returns a Workbook object, allowing you to determine the list of sheet names as its _workbook_.sheetNames property.

```js echo
const workbook = await FileAttachment("../data/laser-report.xlsx").xlsx();
display(workbook);
```

If you inspect the output of this code, you can see that the workbook includes an array of the sheet names in the original file. The `sheetNames` property (e.g. `workbook.sheetNames`) will also return an array of sheet names.

Access individual sheets of the XLSX file by name or number:

```js echo
const sheet1 = await workbook.sheet("Laser Report 2020");
display(sheet1);
```

The `sheet(name[, {range, headers}])` method takes optional parameters:
- `name`: a string or number representing the sheet from which you plan to extract data.
- `range`: a string specifying a rectangular range of cells to extract from the sheet. For example, "B4:K123" specifies a range from top-left cell B4 to bottom-right cell K123, inclusive.
- `headers`: a Boolean that, if true, will treat the first extracted row as column headers and use its cells as field names in returned objects. The default is false.

When you call the data from a specific sheet, we return an array of objects representing those cell values. There are a few situations to note:

- Values are coerced to their corresponding JavaScript types: numbers, strings, Date objects.
- Dates are interpreted in UTC.
- Formula results are included, but formula definitions ignored. Formula errors are coerced to `NaN`.
- Hyperlinks are returned as strings, with a space between URL and text if they differ.
- Empty cells are skipped: objects will not include fields or values for them, but empty rows are kept.
- Row numbers from the source sheet are included as a non-enumerable `"#"` property to assist with recognition and range specification.

For our xlsx file above, we retrieve the headers by calling:

```js echo
const sheet2 = await workbook.sheet("Laser Report 2020", {headers: true});
display(Inputs.table(sheet2));
```

Or, supposing we only wanted to retrieve the first few rows:

```js echo
const sheet3 = await workbook.sheet("Laser Report 2020", {headers: true, range: "1:5"});
display(Inputs.table(sheet3));
```
