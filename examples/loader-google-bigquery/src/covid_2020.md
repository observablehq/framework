# BigQuery COVID-19 Example

## Confirmed Cases in Salerno, Campania (2020)

This document demonstrates loading COVID-19 data from a CSV file, displaying it as a table, and plotting it as a line chart.

## (A) Load and Display Table Data
 
```js
const covidStats = FileAttachment("covidstats_it.csv").csv({typed: true});
```

```js
Inputs.table(covidStats)
``` 

## (B) Load and Display Graph Data

 ```js
display(
  Plot.plot({
    width: 800,
    height: 400,
    marginTop: 30,
    marginBottom: 90,  
    x: {
      type: "utc",
      label: "Date",
      labelAnchor: "right", 
      tickFormat: d3.utcFormat("%Y-%m-%d"),
      tickRotate: -90 
    },
    y: {
      grid: true,
      label: "Confirmed Cases",
      domain: [2000, 3000], 
      tickFormat: d => d
    },
    marks: [
      Plot.lineY(covidStats, {
        x: d => new Date(d.formatted_date),
        y: "confirmed_cases",
        stroke: "steelblue",
        curve: "step"
      }),
      Plot.ruleY([0])
    ]
  })
);
```