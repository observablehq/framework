# Hello dashboard

This is a dashboard.

<div class="grid grid-cols-3">
  <div class="grid-colspan-2 grid-rowspan-2">${resize((width, height) => Plot.plot({
    width,
    height,
    margin: 17,
    marginLeft: 40,
    y: {grid: true},
    marks: [Plot.lineY(aapl, {x: "Date", y: "Close"})]
  }))}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

<div class="grid grid-cols-3">
  <div class="grid-colspan-2">${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

This dashboard features a bento box layout. I am writing some words here to demonstrate how prose might fit between sections of a dashboard. Currently you have to write a lot of CSS grid, but we could create reusable components.

<div class="grid grid-cols-3">
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

```js
function resize(run) {
  let frame;
  const div = Object.assign(document.createElement("DIV"), {style: "position: relative; height: 100%;"});
  const content = div.appendChild(document.createElement("DIV"), {style: "position: absolute;"});
  const observer = new ResizeObserver(([entry]) => {
    const {width, height} = entry.contentRect;
    while (content.lastChild) content.lastChild.remove();
    content.append(run(width, height));
  });
  observer.observe(div);
  return div;
}
```

<style type="text/css">

.grid {
  margin: 1rem 0;
  display: grid;
  grid-auto-rows: 192px;
  gap: 1rem;
}

.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid > * {
  background: var(--theme-background-color-alt);
  border: solid 1px rgba(var(--theme-foreground-rgb), 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}

.grid-colspan-2 {
  grid-column: span 2;
}

.grid-rowspan-2 {
  grid-row: span 2;
}

</style>
