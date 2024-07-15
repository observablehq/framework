# Python data loader to generate CSV

Here’s a Python data loader that performs logistic regression to classify penguin species based on bill and body size measurements, then outputs a CSV file to standard out.

```python
import pandas as pd
from sklearn.linear_model import LogisticRegression
import sys

# Read the CSV
df = pd.read_csv("src/data/penguins.csv")

# Select columns to train the model
X = df.iloc[:, [2, 3, 4, 5]]
Y = df.iloc[:, 0]

# Create an instance of Logistic Regression Classifier and fit the data.
logreg = LogisticRegression()
logreg.fit(X, Y)

results = df.copy();
# Add predicted values
results['species_predicted'] = logreg.predict(X)

# Write to CSV
results.to_csv(sys.stdout)
```

<div class="note">

To run this data loader, you’ll need python3 and the pandas, matplotlib, io, and sys modules installed and available on your `$PATH`.

</div>

<div class="tip">

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

</div>

The above data loader lives in `data/predictions.csv.py`, so we can load the data using `data/predictions.csv` with `FileAttachment`:

```js echo
const predictions = FileAttachment("data/predictions.csv").csv({typed: true});
```

We can create a quick chart of predicted species, highlighting cases where penguins are misclassified, using Observable Plot:

```js echo
Plot.plot({
  grid: true,
  height: 400,
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
})
```
