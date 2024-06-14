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
