# Penguin classification

This is an example Observable Framework project that uses logistic regression (performed in a Python data loader) to classify penguins by species, based on body mass measurements. Charts highlights and explore which penguins are misclassified. [Learn more](https://journal.r-project.org/articles/RJ-2022-020/) about the penguins dataset.

View the [live project](https://observablehq.com/framework/examples/penguin-classification/).

## Data loader

The Python [data loader](https://observablehq.com/framework/loaders) `predictions.csv.py` reads in the `penguins.csv` file, then performs logistic regression using scikit-learn's [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html) function.

## Charts

All charts are drawn with [Observable Plot](https://observablehq/com/plot).

## Reuse this example

Copy the contents of the `penguins-classification` directory into a new Observable Framework project. Then, run the following set up steps (as needed) get started:

- If needed, install python3
- Create and activate a virtual environment
  - `$ python3 -m venv .venv`
  - `$ source .venv/bin/activate`
- Pip install modules from requirements.txt
  - `$ pip install -r requirements.txt`
- Run and preview the page
  - `$ yarn`
  - `$ yarn dev`
- Make changes to the page (`index.md`) or data loader and save to see instant updates in the [live preview](https://observablehq.com/framework/getting-started#test-live-preview)

[Learn more about deploying with Github actions](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-python#requirements-file) for Python 3.6 & `requirements.txt`.
