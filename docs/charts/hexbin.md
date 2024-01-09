# Hexbin chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a hexbin chart using the [dot mark](https://observablehq.com/plot/marks/dot) and [hexbin transform](https://observablehq.com/plot/transforms/hexbin) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  color: {
    scheme: "ylgnbu"
  },
  marks: [
    Plot.hexagon(olympians, Plot.hexbin({fill: "sum"}, {x: "weight", y: "height"}))
  ]
})
```

