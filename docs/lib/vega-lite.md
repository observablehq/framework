# Vega-Lite

```js echo
vl
```

```js echo
vl.markBar()
  .data([
    { a: "A", b: 28 }, { a: "B", b: 55 }, { a: "C", b: 43 },
    { a: "D", b: 91 }, { a: "E", b: 81 }, { a: "F", b: 53 },
    { a: "G", b: 19 }, { a: "H", b: 87 }, { a: "I", b: 52 },
  ])
  .encode(
    vl.x().fieldQ("b"),
    vl.y().fieldN("a"),
    vl.tooltip([vl.fieldQ("b"), vl.fieldN("a")])
  )
  .render()
```
