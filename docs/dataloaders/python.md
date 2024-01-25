# Python data loaders

The Observable CLI supports [data loaders](../loaders) written in Python, by passing them to the [python3](https://www.python.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below (`penguin-logistic.csv.py`) reads in the penguins data from a local file, performs [logistic regression](https://en.wikipedia.org/wiki/Logistic_regression), then outputs a single CSV with penguin species classifications.

Copy and paste the code below into your own Python data loader (with extension .csv.py in your project source root, typically `docs`), then update with your own data and Python code to get started.

```python
# Import libraries (must be installed)
import pandas as pd
from sklearn.linear_model import LogisticRegression
import sys

# Data access, wrangling and analysis
df = pd.read_csv("docs/data/penguins.csv")

X = df.iloc[:, [2, 3, 4, 5]]
Y = df.iloc[:, 0]

logreg = LogisticRegression()
logreg.fit(X, Y)

results = df.copy()
results['speciecs_predicted'] = logreg.predict(X)

# Write pandas data frame to CSV, and to standard output
results.to_csv(sys.stdout)
```

Access the output of the data loader (here, `penguin-logistic.csv`) from the client using [`FileAttachment`](../javascript/files). If your .md and data loader are both in the project root, that is:

```js run=false
const penguinClassification = FileAttachment("penguin-logistic.csv").csv({typed: true});
```
`penguin-logistic.csv` [routes](../loaders#routing) to the `penguin-logistic.csv.py` data loader and reads its standard output stream.

<!-- For local testing of penguin-logistic.csv.py only -->

```js echo=false run=false
const predictions = FileAttachment("penguin-logistic.csv").csv({typed: true});
```

```js echo=false run=false
predictions
```

<!-- End local testing of penguin-logistic.csv.py>

## Arrow

## tar