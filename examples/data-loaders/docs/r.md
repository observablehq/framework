# R data loader examples

Observable Framework supports [data loaders](../loaders) written in R, by passing them to the [Rscript](https://www.r-project.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below (`penguin-kmeans.csv.R`) reads in the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) from a local file, performs [k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering) based on culmen (bill) length and depth, then outputs a single CSV with penguin cluster assignments.

Create a file in your project source root with the .csv.R double extension (for example, `docs/data/my-data.csv.R`), then paste the R code below to get started.

```r
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
```

Access the output of the data loader (here, `penguin-kmeans.csv`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const penguinKmeans = FileAttachment("data/penguin-kmeans.csv").csv({typed: true});
```

`penguin-kmeans.csv` [routes](../loaders#routing) to the `penguin-kmeans.csv.R` data loader and reads its standard output stream.

```js echo
penguinKmeans
```

## JSON

The data loader below (`tolstoy.json.R`) accesses the text of _War and Peace_ from the [Gutenberg Project](https://www.gutenberg.org/ebooks/2600), finds the most common words by chapter, and returns a JSON.

Create a file in your project source root with the .json.R double extension (for example, `docs/data/my-data.json.R`), then paste the R code below to get started.

```r
# Attach libraries (must be installed)
library(tidytext)
library(readr)
library(dplyr)
library(stringr)
library(jsonlite)

# Access and wrangle data
tolstoy <- read_csv("https://www.gutenberg.org/cache/epub/2600/pg2600.txt") |>
  rename(text = 1)
booktext <- tolstoy[-(1:400), ]
booktext <- booktext[-(51477:51770), ]

tidy_tolstoy <- booktext |>
  mutate(book = cumsum(str_detect(text, "BOOK | EPILOGUE"))) |>
  mutate(book = case_when(
    book < 16 ~ paste("Book", book),
    book == 16 ~ "Epilogue 1",
    book == 17 ~ "Epilogue 2"
  )) |>
  group_by(book) |>
  mutate(chapter = cumsum(str_detect(text, regex("CHAPTER", ignore_case = FALSE)))) |>
  ungroup() |>
  filter(!str_detect(text, regex("BOOK", ignore_case = FALSE))) |>
  filter(!str_detect(text, regex("CHAPTER", ignore_case = FALSE))) |>
  unnest_tokens(word, text) |>
  anti_join(stop_words)

# Find top 10 words (by count) for each chapter
tolstoy_word_counts <- tidy_tolstoy |>
  group_by(book, chapter) |>
  count(word) |>
  top_n(10, n) |>
  arrange(desc(n), .by_group = TRUE)

# Create JSON and write to standard output
cat(toJSON(tolstoy_word_counts, pretty = TRUE))
```

Access the output of the data loader (here, `tolstoy.json`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const text = FileAttachment("data/tolstoy.json").json()
```

`tolstoy.json` [routes](../loaders#routing) to the `tolstoy.json.R` data loader and reads its standard output stream.

```js echo
text
```

## ZIP

The data loader below (`penguin-mlr.zip.R`) reads in the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) from a local file, performs multiple linear regression, then outputs multiple files (with model estimates and predictions) as a ZIP archive.

Create a file in your project source root with the .zip.R double extension (for example, `docs/data/my-data.zip.R`), then paste the R code below to get started.

```r
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
const modelZip = FileAttachment("data/penguin-mlr.zip").zip();
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
const modelPredictions = FileAttachment("data/penguin-mlr/predictions.csv").csv({typed: true})
```

```js echo
modelPredictions
```
