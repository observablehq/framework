[Framework examples →](../)

# Python data loader to generate CSV

View live: <https://observablehq.observablehq.cloud/framework-example-loader-python-to-csv/>

This Observable Framework example demonstrates how to write a data loader in Python to generate a CSV file. The data loader uses scikit-learn’s [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html) function to classify [penguins](https://journal.r-project.org/articles/RJ-2022-020/) by species, based on body mass, culmen and flipper measurements. Charts (made with Observable Plot) explore which penguins are misclassified.

The data loader lives in [`src/data/predictions.csv.py`](./src/data/predictions.csv.py).
