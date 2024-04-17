# Penguin classification

```js
const predictions = FileAttachment("data/predictions.csv").csv({typed: true});
```

<div class="grid grid-cols-1" style="grid-auto-rows: 560px;">
  <div class="card">
    ${resize((width, height) => Plot.plot({
        grid: true,
        width,
        height: height - 95,
        title : "Predicting penguins species with logistic regression",
        caption: "Incorrect predictions highlighted with diamonds. Actual species encoded with color and predicted species encoded with symbols.",
        color: {
          legend: true,
        },
        x: {label: "Culmen length (mm)"},
        y: {label: "Culmen depth (mm)"},
        marks: [
          Plot.dot(predictions, {
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            stroke: "species",
            symbol: "species_predicted",
            r: 3,
            tip: {channels: {"mass": "body_mass_g"}}
          }),
          Plot.dot(predictions, {
            filter: (d) => d.species !== d.species_predicted,
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            r: 7,
            symbol: "diamond",
            stroke: "currentColor"
          })
        ],
      }))}
  </div>
</div>

<div class="card" style="margin: 1rem 0 2rem 0; padding: 0;">
  ${Inputs.table(predictions)}
</div>

## Analysis

```js
const misclassified = predictions.filter((d) => d.species !== d.species_predicted);
```

The logistic regression failed to classify ${misclassified.length} individuals. Let’s check what was amiss, with this faceted chart:

<div class="grid grid-cols-1" style="grid-auto-rows: 560px;">
  <div class="card">
    ${resize((width, height) => Plot.plot({
        width,
        height,
        inset: 4,
        grid: true,
        marginRight: 60,
        x: {label: "Culmen length (mm)"},
        y: {label: "Culmen depth (mm)"},
        facet: {
          data: predictions,
          x: "island",
          y: "sex",
        },
        fy: {domain: ["FEMALE", "MALE"]},
        marks: [
          Plot.frame(),
          Plot.dot(predictions, {
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            stroke: "species",
            symbol: "species_predicted",
            r: 3
          }),
          Plot.dot(predictions, {
            filter: (d) => d.species !== d.species_predicted,
            x: "culmen_length_mm",
            y: "culmen_depth_mm",
            r: 7,
            symbol: "diamond",
            stroke: "currentColor"
          })
        ],
      }))}
  </div>
</div>

As we can see in the top-right facet, the classifier could have done a better job at discovering that the Torgensen island only hosts penguins of the Adelie species.

We could try re-running the analysis with different options — _e.g._, <code>LogisticRegression(solver = "newton-cg")</code> — to see if that results in better predictions. (Spoiler: it does!) See the [scikit-learn documentation](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html) for details.
