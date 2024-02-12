# Executable data loader examples

Observable Framework supports arbitrary executable (.exe) data loaders, which _can_ be any arbitrary executable (_e.g._ compiled from C) but often specify another interpreter using a shebang as shown in the examples below. Unlike interpreted data loaders (_e.g._ Python, R), executable data loaders require that you make the loader executable, typically done via `chmod`. For example:

```sh
chmod +x docs/quakes.csv.exe
```

## JPEG (R interpreter)

The data loader below `diamonds.jpeg.exe` specifies the R interpreter, `Rscript`, to execute the file (`#!/usr/bin/env Rscript`). A scatterplot chart built with [`ggplot2`](https://ggplot2.tidyverse.org/) using the built-in diamonds dataset is returned as a JPEG to standard output.

Create a file in your project source root, with the .jpeg.exe double extension (for example, `docs/my-chart.jpeg.exe`), then paste the code below to get started.

```exe
#!/usr/bin/env Rscript

# Load ggplot2
library(ggplot2)

# Create a scatterplot with built-in diamonds dataset
my_plot <- ggplot(diamonds, aes(x = carat, y = price, color = cut)) +
  geom_point(alpha = 0.6) +
  labs(
    title = "Diamonds Dataset: Carat vs Price by Cut",
    x = "Carat",
    y = "Price",
    color = "Cut"
  )

# Save jpeg and write to standard output
ggsave(plot = my_plot, filename = "/dev/stdout", device = "jpeg")
```

Access the output of the data loader (here, `diamonds.jpeg`) from the client using [`FileAttachment`](../javascript/files):

```js echo
const diamonds = FileAttachment("diamonds.jpeg").image({width: 500})
```

`diamonds.jpeg` [routes](../loaders#routing) to the `diamonds.jpeg.exe` data loader and reads its standard output stream.

```js echo
diamonds
```

## TXT (Julia interpreter)

The data loader below `raven.txt.exe` specifies the Julia language interpreter using the shebang (`#!/usr/bin/env julia`). Text of Edgar Allen Poe's _The Raven_ is accessed from [Project Gutenberg](https://www.gutenberg.org/cache/epub/1065/pg1065.txt). The text is parsed and single paragraph (specified by number) is returned as text.

```exe
#!/usr/bin/env julia

# Load Julia packages (must be installed)
using HTTP
using Gumbo
using TextAnalysis

# Function to fetch text
function fetch_text_from_url(url::String)
  response = HTTP.get(url)
  text = String(response.body)
  text = replace(text, "\r" => "")
  return text
end

# Split into paragraphs
function split_into_paragraphs(text::String)
    paragraphs = split(text, "\n\n")
    return paragraphs
end

# Return a paragraph by number
function get_paragraph_by_number(text::String, paragraph_number::Int)
  paragraphs = split_into_paragraphs(text)
  return paragraphs[paragraph_number]
end

# Text URL
url = "https://www.gutenberg.org/cache/epub/1065/pg1065.txt"

# Fetch text and access a paragraph by number
text = fetch_text_from_url(url)
paragraph_number = 29
result_paragraph = get_paragraph_by_number(text, paragraph_number)

# Print text to standard output
println(result_paragraph)
```

Access the output of the data loader (here, `raven.txt`) using [`FileAttachment`](../javascript/files):

```js echo
const ravenParagraph = FileAttachment("raven.txt").text();
```

`raven.txt` [routes](../loaders#routing) to the `raven.txt.exe` data loader and reads its standard output stream.

```js echo
ravenParagraph
```
