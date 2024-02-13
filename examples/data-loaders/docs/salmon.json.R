# Attach libraries (must be installed)
library(rvest)
library(purrr)
library(jsonlite)

# Data access, wrangling and analysis
years <- seq(from = 2010, to = 2022, by = 1)
url <- vector(length = length(years))
query_urls <- for (i in seq_along(years)) {
  url[i] <- paste0(
    "http://www.cbr.washington.edu/dart/cs/php/rpt/adult_daily.php?sc=1&outputFormat=html&year=",
    years[i], "&proj=BON&span=no&startdate=1%2F1&enddate=12%2F31&run=&syear=",
    years[i],
    "&eyear=",
    years[i]
  )
}

get_data <- function(url) {
  url %>%
    read_html() %>%
    html_table() %>%
    flatten_df()
}

dart_data <- map_dfr(url, get_data)
dart_data[, 4:13] <- lapply(dart_data[, 4:13], as.numeric)

# Create JSON and write to standard output
cat(toJSON(dart_data, pretty = TRUE))
