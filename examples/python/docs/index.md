# Python

```js
const penguins = FileAttachment("data/penguins.csv").csv({typed: true});
```

<div class="grid grid-cols-1" style="grid-auto-rows: 420px;">
  <div class="card grid-colspan-1">
    ${resize((width, height) => Plot.plot({
        grid: true,
        width,
        height,
        marks: [
          Plot.dot(penguins, {x: "culmen_length_mm", y: "culmen_depth_mm", stroke: "species"})
        ],
      }))}
  </div>
</div>
<div class="card">
  ${display(Inputs.table(penguins))}
</div>
