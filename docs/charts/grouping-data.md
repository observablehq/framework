# Grouping data

 [Observable Plot](https://observablehq.com/plot/) provides a number of [transforms](https://observablehq.com/plot/transforms/) that help you perform common data transformations. The [group](https://observablehq.com/plot/transforms/group) and [bin](https://observablehq.com/plot/transforms/bin) transforms (for categorical and quantitative data, respectively) group data into discrete bins. A reducer (e.g. sum, count, or mean) can then be applied to visualize summary values by bin. 

 The snippets on this page demonstrate hexbin and bin transforms, each combined with a reducer (e.g. sum, count, or mean), to visualize summary values in a hexbin chart and histogram. 

## Hexbin chart 

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a hexbin chart using the [dot mark](https://observablehq.com/plot/marks/dot) and [hexbin transform](https://observablehq.com/plot/transforms/hexbin) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  color: {scheme: "ylgnbu"},
  marks: [
    Plot.dot(olympians, Plot.hexbin({fill: "sum"}, {x: "weight", y: "height"}))
  ]
})
```

## Histogram

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a histogram using the [rect mark](https://observablehq.com/plot/marks/rect) and [bin transform](https://observablehq.com/plot/transforms/bin) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  marks: [
    Plot.rectY(olympians, Plot.binX({y: "count"}, {x: "weight"})),
    Plot.ruleY([0])
  ]
})
```
