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
results["predicted_species"] = logreg.predict(X)

df_out = df.merge(
    results[["predicted_species"]], how="left", left_index=True, right_index=True
)

# Write the data frame to CSV, and to standard output
df_out.to_csv(sys.stdout)
