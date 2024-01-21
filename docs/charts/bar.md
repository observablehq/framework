# Bar chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create bar charts using the [bar mark](https://observablehq.com/plot/marks/bar) from [Observable Plot](https://observablehq.com/plot/). 

## Sorted bar chart

```js echo
Plot.plot({
  marks: [
    Plot.barY(alphabet, {x: "letter", y: "frequency", sort: {x: "y", reverse: true}}),
    Plot.ruleY([0])
  ]
})
```

## Horizontal bar chart

```js echo
Plot.plot({
  marks: [
    Plot.barX(alphabet, {x: "frequency", y: "letter", sort: {y: "x", reverse: true}}),
    Plot.ruleX([0])
  ]
})
```

## Top 10 bar chart

```js echo
Plot.plot({
  marks: [
    Plot.barX(olympians, Plot.groupY({x: "count"}, {y: "nationality", sort: {y: "x", reverse: true, limit: 10}})),
    Plot.ruleX([0])
  ]
})
```

## Weighted top 10 bar chart

```js echo
Plot.plot({
  marks: [
    Plot.barX(olympians, Plot.groupY({x: "sum"}, {x: "gold", y: "nationality", sort: {y: "x", reverse: true, limit: 10}})),
    Plot.ruleX([0])
  ]
})
```

## Temporal bar chart

```js echo
Plot.plot({
  marks: [
    Plot.rectY(weather.slice(-42), {x: "date", y: "wind", interval: d3.utcDay}),
    Plot.ruleY([0])
  ]
})
```