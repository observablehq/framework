# R data loader examples

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
cat(format_csv(penguin_clusters))
```

Access the output of the data loader (here, `penguin-kmeans.csv`) from the client using [`FileAttachment`](../javascript/files):

```js run=false
const penguinKmeans = FileAttachment("penguin-kmeans.csv").csv({typed: true});
```
`penguin-kmeans.csv` [routes](../loaders#routing) to the `penguin-kmeans.csv.R` data loader and reads its standard output stream.

<!-- For local testing of penguin-kmeans.csv.R only -->

```js echo run
const penguinKmeans = FileAttachment("penguin-kmeans.csv").csv({typed: true});
```

```js echo run
penguinKmeans
```

<!-- End local testing of penguin-kmeans.csv.R -->

## JSON

The data loader below (`salmon.json.R`) scrapes adult daily salmon data at Bonneville Dam (2010 - 2022) from tables on the [Columbia River DART](https://www.cbr.washington.edu/dart) site, then returns the output as a JSON file. 

Copy and paste the code below into your own R data loader (with extension .json.R in your project source root, typically `docs`), then update with your own data and R code to get started.

```r
# Attach libraries (must be installed)
library(rvest)
library(purrr)
library(jsonlite)

# Data access, wrangling and analysis
years <- seq(from = 2010, to = 2022, by = 1)
url <- vector(length = length(years))
query_urls <- for (i in seq_along(years)) {
  url[i] <- paste0("http://www.cbr.washington.edu/dart/cs/php/rpt/adult_daily.php?sc=1&outputFormat=html&year=", 
                       years[i], "&proj=BON&span=no&startdate=1%2F1&enddate=12%2F31&run=&syear=", 
                       years[i], 
                       "&eyear=", 
                       years[i])
  }

get_data <- function(url) {
    url %>% 
    read_html() %>% 
    html_table() %>% 
    flatten_df()
}

dart_data <- map_dfr(url, get_data)
dart_data[,4:13] <- lapply(dart_data[,4:13], as.numeric)

# Create JSON and write to standard output
cat(toJSON(dart_data, pretty = TRUE))
```

Access the output of the data loader (here, `salmon.json`) from the client using [`FileAttachment`](../javascript/files):

```js run=false
const salmon = FileAttachment("salmon.json").json();
```

`salmon.json` [routes](../loaders#routing) to the `salmon.json.R` data loader and reads its standard output stream.

<!-- For local testing of salmon.json.R only -->

```js echo run
const salmon = FileAttachment("salmon.json").json();
```

```js echo run
salmon
```

<!-- End local testing of salmon.json.R -->


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

Load the output of the data loader (here, `penguin-mlr.zip`) from the client using [`FileAttachment`](../javascript/files). Here, that is:

```js echo
const modelZip = FileAttachment("penguin-mlr.zip").zip();
```

Then access individual files from the ZIP archive:

```js echo
const modelEstimates = modelZip.file("estimates.csv").csv({typed: true});
```

```js echo
modelEstimates
```

Alternatively, access individual files from the ZIP archive straightaway:

```js echo
const modelPredictions = FileAttachment("penguin-mlr/predictions.csv").csv({typed: true})
```

```js echo
modelPredictions
```