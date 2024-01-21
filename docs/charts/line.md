# Line chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a line chart using the [line mark](https://observablehq.com/plot/marks/line) from [Observable Plot](https://observablehq.com/plot/).

## Basic line chart

```js echo
Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(aapl, {x: "Date", y: "Close"})
  ]
})
```

## Multi-series line chart

```js echo
Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(industries, {x: "date", y: "unemployed", z: "industry"})
  ]
})
```

## Moving average line chart

```js echo
Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(aapl, Plot.windowY({x: "Date", y: "Close", k: 10, reduce: "mean"}))
  ]
})
```