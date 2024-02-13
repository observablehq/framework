# Import libraries (must be installed)
import pandas as pd
from sklearn.linear_model import LogisticRegression
import sys

# Data access, wrangling and analysis
df = pd.read_csv("docs/data-files/penguins.csv")
df_complete = df.dropna(
    subset=["culmen_length_mm", "culmen_depth_mm", "flipper_length_mm", "body_mass_g"]
)

X = df_complete.iloc[:, [2, 3, 4, 5]]
Y = df_complete.iloc[:, 0]

logreg = LogisticRegression()
logreg.fit(X, Y)

results = df_complete.copy()
results["species_predicted"] = logreg.predict(X)

# Write the data frame to CSV, and to standard output
results.to_csv(sys.stdout)
