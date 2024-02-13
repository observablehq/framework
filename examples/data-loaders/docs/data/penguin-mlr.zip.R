# Attach required packages (must be installed)
library(readr)
library(tidyr)
library(dplyr)
library(broom)

# Data access, wrangling and analysis
penguins <- read_csv("docs/data-files/penguins.csv") |>
    drop_na(body_mass_g, species, sex, flipper_length_mm, culmen_depth_mm)

penguins_mlr <- lm(body_mass_g ~ species + sex + flipper_length_mm + culmen_depth_mm, data = penguins)

mlr_est <- tidy(penguins_mlr)

mlr_fit <- penguins |>
    mutate(
        body_mass_g_predict = penguins_mlr$fitted.values,
        body_mass_g_residual = penguins_mlr$residuals
    )

# Write the data frames as CSVs to a temporary directory
setwd(tempdir())
write_csv(mlr_est, "estimates.csv")
write_csv(mlr_fit, "predictions.csv")

# Zip the contents of the temporary directory
system("zip - -r .")
