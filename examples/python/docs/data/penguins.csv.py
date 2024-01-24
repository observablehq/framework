import pandas as pd
import sys

# Read the CSV
df = pd.read_csv("docs/data/penguinsRaw.csv")

# Write the CSV
df.to_csv(sys.stdout)
