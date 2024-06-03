# R data loader to generate JSON

Here’s an R data loader that accesses Tolstoy’s _War and Peace_ from the [Gutenberg Project](https://www.gutenberg.org/ebooks/2600), finds the most common words by book and chapter, then outputs JSON.

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

<div class="note">

To run this data loader, you’ll need R installed, along with all required packages, _e.g._ by running `install.packages(c("tidytext", "readr", "dplyr", "stringr", "jsonlite"))`.

</div>

The above data loader lives in `data/tolstoy.json.R`, so we can load the data as `data/tolstoy.json` using `FileAttachment`.

```js echo
const text = FileAttachment("data/tolstoy.json").json();
```

We can display this dataset with Inputs.table:

```js echo
Inputs.table(text)
```

We can make a quick chart of top words in Book 1, with color mapped to book chapter, using [Observable Plot](https://observablehq.com/plot/):

```js echo
Plot.plot({
  marks: [
    Plot.barY(text, {
      filter: (d) => d.book === "Book 1",
      x: "word",
      y: "n",
      fill: "chapter",
      tip: true,
      sort: {x: "y", limit: 5, reverse: true}
    })
  ]
})
```
