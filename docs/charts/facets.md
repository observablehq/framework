# Faceted chart

Copy the code snippet below, paste into a JavaScript code block, then substitute your own data to create a faceted chart with small multiples using the [facet channel](https://observablehq.com/plot/features/facets) from [Observable Plot](https://observablehq.com/plot/). 

```js echo
Plot.plot({
  facet: {
    data: penguins,
    x: "species"
  },
  marks: [
    Plot.frame(),
    Plot.dot(penguins, {x: "culmen_length_mm", y: "culmen_depth_mm"})
  ]
})
```