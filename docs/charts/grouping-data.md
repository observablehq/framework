# Grouping data

[Observable Plot](https://observablehq.com/plot/) provides a number of [transforms](https://observablehq.com/plot/transforms/) that help you perform common data transformations. The [group](https://observablehq.com/plot/transforms/group) and [bin](https://observablehq.com/plot/transforms/bin) transforms (for categorical and quantitative dimensions, respectively) group data into discrete bins. A reducer (_e.g._ sum, count, or mean) can then be applied to visualize summary values by bin. 

## Hexbin chart 

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a hexbin chart using the [dot mark](https://observablehq.com/plot/marks/dot) and the [hexbin transform](https://observablehq.com/plot/transforms/hexbin). 

```js echo
Plot.plot({
  color: {scheme: "ylgnbu"},
  marks: [
    Plot.dot(olympians, Plot.hexbin({fill: "sum"}, {x: "weight", y: "height"}))
  ]
})
```

## Histogram

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a histogram using the [rect mark](https://observablehq.com/plot/marks/rect) and the [bin transform](https://observablehq.com/plot/transforms/bin). 

```js echo
Plot.plot({
  marks: [
    Plot.rectY(olympians, Plot.binX({y: "count"}, {x: "weight"})),
    Plot.ruleY([0])
  ]
})
```
