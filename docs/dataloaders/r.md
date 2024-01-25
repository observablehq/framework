# R data loaders

The Observable CLI supports [data loaders](../loaders) written in R, by passing them to the [Rscript](https://www.r-project.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below (`penguin-kmeans.csv.R`) reads in the penguins data from a local file, performs [k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering) based on culmen (bill) length and depth, then outputs a single CSV with penguin cluster assignments.

Copy and paste the code below into your own R data loader (with extension .csv.R in your project source root, typically `docs`), then update with your own data and R code to get started.

```r
# Attach libraries (must be installed)
library(readr)
library(dplyr)
library(tidyr)

# Data access, wrangling and analysis
penguins <- read_csv("docs/data/penguins.csv") |> 
  drop_na(culmen_depth_mm, culmen_length_mm)

penguin_kmeans <- penguins |> 
  select(culmen_depth_mm, culmen_length_mm) |> 
  scale() |> 
  kmeans(centers = 3)

penguin_clusters <- penguins |> 
  mutate(cluster = penguin_kmeans$cluster)

# Convert data frame to delimited string, then write to standard output
writeLines(format_csv(penguin_clusters), stdout())
```

Access the output of the data loader (here, `penguin-kmeans.csv`) from the client using [`FileAttachment`](../javascript/files). If your .md and data loader are both in the project root, that is:

```js run=false
const penguinKmeans = FileAttachment("penguin-kmeans.csv").csv({typed: true});
```

<!-- For local testing of penguin-kmeans.csv.R only 
Note: Since page is in a subdirectory (dataloaders), path to loader output is ../penguin-kmeans.csv
Example visible to readers (above) follows recommendation that pages (.md) & loaders both in /docs
-->

```js echo=false run=false
const penguinKmeans = FileAttachment("../penguin-kmeans.csv").csv({typed: true});
```

```js echo=false run=false
penguinKmeans
```

<!-- End local testing of penguin-kmeans.csv.R -->

## ZIP

The data loader below (`penguin-mlr.zip.R`) reads in the penguins data from a local file, performs multiple linear regression, then outputs multiple files (with model estimates and predictions) as a ZIP archive. 

Copy and paste the code below into your own R data loader (with extension .zip.R in your project source root, typically `docs`), then update with your own data and R code to get started.

```r
# Attach required packages (must be installed)
library(readr)
library(tidyr)
library(dplyr)
library(broom)

# Data access, wrangling and analysis
penguins <- read_csv("docs/data/penguins.csv") |> 
    drop_na(body_mass_g, species, sex, flipper_length_mm, culmen_depth_mm)

penguins_mlr <- lm(body_mass_g ~ species + sex + flipper_length_mm + culmen_depth_mm, data = penguins)

mlr_est <- tidy(penguins_mlr)

mlr_fit <- penguins |> 
    mutate(body_mass_g_predict = penguins_mlr$fitted.values,
           body_mass_g_residual = penguins_mlr$residuals
    )

# Write the data frames as CSVs to a temporary directory
setwd(tempdir())
write_csv(mlr_est, "estimates.csv")
write_csv(mlr_fit, "predictions.csv")

# Zip the contents of the temporary directory
system("zip - -r .")
```

The `system` function invokes the system command `"zip - -r ."`, where:
- `zip` is the command for zipping files
- `-` means the archive is output to standard output (required for data loaders)
- `-r`, the recursive option, means all files are added to the zip archive
- `.` compresses the current working directory

Load the output of the data loader (here, `penguin-mlr.zip`) from the client using [`FileAttachment`](../javascript/files). If your .md and data loader are both in the project root, that is:

```js run=false
const modelZip = FileAttachment("penguin-mlr.zip").zip();
```

You can then access individual files from the ZIP archive:

```js run=false
const modelEstimates = modelZip.file("estimates.csv").csv({typed: true});
```

<!-- For local testing of penguin-mlr.zip.R only 
Note: Since page is in a subdirectory (dataloaders), path to loader output is ../penguin-mlr.zip
Example visible to readers (above) follows recommendation that pages (.md) & loaders both in /docs
-->

```js echo=false run=false
const modelZip = FileAttachment("../penguin-mlr.zip").zip();
```

```js echo=false run=false
const modelEstimates = modelZip.file("estimates.csv").csv({typed: true});
```

```js echo=false run=false
modelEstimates
```

<!-- End local testing of penguin-mlr.zip.R -->