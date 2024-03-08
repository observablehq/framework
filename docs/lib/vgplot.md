---
sql:
  gaia: ./gaia-sample.parquet
---

# Hello, vgplot

```js echo
vg.plot(vg.raster(vg.from("gaia"), {x: "ra", y: "dec", fill: "density"}))
```
