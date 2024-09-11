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
