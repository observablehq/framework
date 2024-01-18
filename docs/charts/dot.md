# Scatterplot

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a scatterplot chart using the [dot mark](https://observablehq.com/plot/marks/dot) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  marks: [
    Plot.dot(cars, {x: "power (hp)", y: "economy (mpg)"})
  ]
})
```