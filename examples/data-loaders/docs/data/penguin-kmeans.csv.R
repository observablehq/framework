# Attach libraries (must be installed)
library(readr)
library(dplyr)
library(tidyr)

# Data access, wrangling and analysis
penguins <- read_csv("docs/data-files/penguins.csv") |>
  drop_na(culmen_depth_mm, culmen_length_mm)

penguin_kmeans <- penguins |>
  select(culmen_depth_mm, culmen_length_mm) |>
  scale() |>
  kmeans(centers = 3)

penguin_clusters <- penguins |>
  mutate(cluster = penguin_kmeans$cluster)

# Convert data frame to delimited string, then write to standard output
cat(format_csv(penguin_clusters))
