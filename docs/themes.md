---
theme: [air, near-midnight]
---

# Themes

<div class="grid grid-cols-2">
  <div class="card">
    <h2>This is a title</h2>
    <h3>This is a subtitle</h3>
    <p>And a paragraph of text</p>
  </div>
  <div class="card">two</div>
</div>

```js echo
Plot.plot({
  y: {grid: true},
  marks: [
    Plot.lineY(aapl, {x: "Date", y: "Close", strokeOpacity: 0.5}),
    Plot.lineY(aapl, Plot.windowY(20, {x: "Date", y: "Close", stroke: "var(--theme-foreground-focus)"})),
  ]
})
```

Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.

It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
