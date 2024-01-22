# Tick chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a tick chart using the [tick mark](https://observablehq.com/plot/marks/tick) from [Observable Plot](https://observablehq.com/plot/).

```js echo
Plot.plot({
  marks: [
    Plot.tickX(cars, {x: "economy (mpg)", y: "year"})
  ]
})
```