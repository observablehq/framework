# Classification prediction

```js
const predictions = FileAttachment("data/predictions.csv").csv({typed: true});
```

<div class="grid grid-cols-1" style="grid-auto-rows: 420px;">
  <div class="card grid-colspan-1">
    ${resize((width, height) => Plot.plot({
        grid: true,
        width,
        height: height - 60,
        title : "Predicting penguins species with logistic regression",
        caption: "Incorrect predictions highlighted with white diamonds. Actual species encoded with color and predicted species encoded with symbols.",
        x: {label: "Culmen length (mm) →"},
        y: {label: "↑ Culmen depth (mm)"},
        marks: [
          Plot.dot(predictions, {
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            stroke: "species",
            symbol: "speciecs_predicted"
          }),
          Plot.dot(predictions.filter(d => d.species !== d.speciecs_predicted), {
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            r: 8,
            symbol: "diamond",
            stroke: "currentColor"
          })
        ],
      }))}
  </div>
</div>
<div class="card">
  ${display(Inputs.table(predictions))}
</div>
