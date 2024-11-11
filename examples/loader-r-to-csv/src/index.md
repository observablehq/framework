# R data loader to generate CSV

Here’s an R data loader that performs k-means clustering with penguin body size measurements then outputs a CSV file to standard out.

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

<div class="note">

To run this data loader, you’ll need R installed, along with the `readr`, `dplyr`, and `tidyr` libraries, _e.g._ with `install.packages("dplyr"`).

</div>

The above data loader lives in `data/penguin-kmeans.csv.R`, so we can load the data using `data/penguin-kmeans.csv`. You can access the output in a markdown page using the `FileAttachment.csv` method:

```js echo
const penguinKmeans = FileAttachment("data/penguin-kmeans.csv").csv({typed: true});
```

We can display the contents of `penguinKmeans` with `Inputs.table`:

```js echo
Inputs.table(penguinKmeans)
```

We can pass the data to `Plot.plot` to make a scatterplot of penguin size (body mass and flipper length) with text indicating the assigned cluster number and color mapped to penguin species.

```js echo
Plot.plot({
  color: {
    legend: true,
    range: ["lightseagreen", "orchid", "darkorange"]
  },
  marks: [
    Plot.text(penguinKmeans, {
      text: "cluster",
      x: "body_mass_g",
      y: "flipper_length_mm",
      fill: "species",
      fontWeight: 600
    })
  ]
})
```
