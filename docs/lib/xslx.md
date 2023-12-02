# XLSX

Let’s read a Microsoft Excel spreadsheet using [ExcelJS](https://github.com/exceljs/exceljs).

```js echo
const workbook = await FileAttachment("laser-report.xlsx").xlsx();
const reports = workbook.sheet("Laser Report 2020", {range: "A:J", headers: true});
```

```js echo
Inputs.table(reports)
```

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
