# Histogram

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a histogram using the [rect mark](https://observablehq.com/plot/marks/rect) and [bin transform](https://observablehq.com/plot/transforms/bin) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  marks: [
    Plot.rectY(olympians, Plot.binX({y: "count"}, {x: "weight"})),
    Plot.ruleY([0])
  ]
})
```