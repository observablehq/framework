# Cell chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a cell chart using the [cell mark](https://observablehq.com/plot/marks/cell) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  marks: [
    Plot.cell(weather.slice(-365), {
      x: d => d.date.getUTCDate(),
      y: d => d.date.getUTCMonth(),
      fill: "temp_max"
    })
  ]
})
```