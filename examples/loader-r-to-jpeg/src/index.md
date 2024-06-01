# R data loader to generate a JPEG

Here’s an R data loader that creates a scatterplot using ggplot2, then writes the chart to standard output as a JPEG. The scatterplot shows patterns for diamond price and clarity using the [diamonds](https://ggplot2.tidyverse.org/reference/diamonds.html) dataset, which is built into the [ggplot2 package](https://ggplot2.tidyverse.org/).

```r
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

# Save as jpeg and write to standard output
ggsave(plot = my_plot, filename = "/dev/stdout", device = "jpeg")
```

<div class="note">

To run this data loader, you’ll need R and the `ggplot2` package installed, _e.g._ using `install.packages("ggplot2")`.

</div>

The above data loader lives in `data/diamonds.jpeg.R`, so we can load the data using `data/diamonds.jpeg`. Access the image in a markdown page using FileAttachment:

```js echo
const diamonds = FileAttachment("data/diamonds.jpeg").image({width: 500});
```

```js echo
diamonds
```
