# R data loader to generate a ZIP archive

The data loader below reads in the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) from a local file, performs multiple linear regressions, then outputs multiple files (with model estimates and predictions) as a ZIP archive.

```r
# Attach required packages (must be installed)
library(readr)
library(tidyr)
library(dplyr)
library(broom)

# Data access, wrangling and analysis
penguins <- read_csv("src/data/penguins.csv") |>
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
```

<div class="note">

To run this data loader, you’ll need R installed, along with the readr, tidyr, dplyr, and broom packages, _e.g._ using `install.packages("dplyr")`.

</div>

The system function invokes the system command `"zip - -r ."`, where:

- `zip` is the command for zipping files
- `-` means the archive is output to standard output (required for data loaders)
- `-r`, the recursive option, means all files are added to the zip archive
- `.` compresses the current working directory

Access individual files (`estimates.csv`, or `predictions.csv`) from the generated ZIP archive using FileAttachment:

```js echo
const modelEstimates = FileAttachment("data/penguin-mlr/estimates.csv").csv({typed: true});
```

```js echo
const modelPredictions = FileAttachment("data/penguin-mlr/predictions.csv").csv({typed: true});
```

We can quickly display the model estimates and predictions using [Inputs.table](https://observablehq.com/framework/inputs/table):

```js echo
Inputs.table(modelEstimates)
```

```js echo
Inputs.table(modelPredictions)
```
