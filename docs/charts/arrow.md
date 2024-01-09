# Arrow chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create arrow charts using the [arrow mark](https://observablehq.com/plot/marks/arrow) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  x: {
    type: "log"
  },
  marks: [
    Plot.arrow(citywages, {
      x1: "POP_1980",
      y1: "R90_10_1980",
      x2: "POP_2015",
      y2: "R90_10_2015",
      bend: true
    })
  ]
})
```