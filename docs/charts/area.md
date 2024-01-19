# Area chart

Copy the code snippets below, paste into a JavaScript code block, then substitute your own data to create area charts using the [area mark](https://observablehq.com/plot/marks/area) from [Observable Plot](https://observablehq.com/plot/). 

## Area chart

```js echo
Plot.plot({
  marks: [
    Plot.areaY(aapl, {x: "Date", y: "Close"}),
    Plot.ruleY([0])
  ]
})
```

## Band area chart

```js echo
Plot.plot({
  marks: [
    Plot.areaY(weather.slice(-365), {x: "date", y1: "temp_min", y2: "temp_max", curve: "step"})
  ]
})
```

## Stacked area chart

```js echo
Plot.plot({
  y: {
    tickFormat: "s"
  },
  marks: [
    Plot.areaY(industries, {x: "date", y: "unemployed", fill: "industry"}),
    Plot.ruleY([0])
  ]
})
```


