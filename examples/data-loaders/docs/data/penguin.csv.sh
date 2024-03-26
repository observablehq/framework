#!/bin/bash

# Start a Python script
python3 << END_PYTHON

# Import libraries
import sys
import pandas as pd
from sklearn.linear_model import LinearRegression

# Data access and wrangling
penguins = pd.read_csv("docs/data-files/penguins.csv")
penguins_size = penguins[["species", "body_mass_g", "flipper_length_mm", "sex"]]
penguins_complete = penguins_size.dropna(subset=["flipper_length_mm","body_mass_g"])

# Write pandas df as a CSV to standard output 
penguins_complete.to_csv(sys.stdout)
END_PYTHON