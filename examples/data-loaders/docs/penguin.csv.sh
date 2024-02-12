#!/bin/bash

# Start a Python script
python3 << END_PYTHON
import sys
import pandas as pd
from sklearn.linear_model import LinearRegression

penguins = pd.read_csv("docs/data/penguins.csv")

penguins_complete = penguins.dropna(subset=["culmen_length_mm", "culmen_depth_mm", "flipper_length_mm", "body_mass_g"])

penguins_complete.to_csv(sys.stdout)
END_PYTHON