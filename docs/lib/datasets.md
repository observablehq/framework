# Sample datasets

When you want to demonstrate a feature, practice your [Plot](plot)-fu and learn to wrangle data —or to create a minimal reproducible example for a bug report—, it is useful to have a few common datasets at hand. The following symbols default to well-known datasets:

- **aapl** — A time series of Apple stock. [Yahoo! Finance](https://finance.yahoo.com/lookup)
- **alphabet** — Relative frequencies of letters in English. [_Cryptographical Mathematics_ by Robert Edward Lewand](http://cs.wellesley.edu/~fturbak/codman/letterfreq.html)
- **cars** - [1983 ASA Data Exposition](http://lib.stat.cmu.edu/datasets/)
- **citywages** — [The Upshot](https://www.nytimes.com/2019/12/02/upshot/wealth-poverty-divide-american-cities.html)
- **diamonds** — ggplot2 “diamonds” dataset (carat and price columns only)
  [source](https://github.com/tidyverse/ggplot2/blob/master/data-raw/diamonds.csv)
- **flare** — [Flare visualization toolkit package hierarchy](https://observablehq.com/@d3/treemap)
- **industries** — U.S. Bureau of Labor Statistics
- **miserables** Character interactions in the chapters of “Les Miserables”, [Donald Knuth, Stanford Graph Base](https://www-cs-faculty.stanford.edu/~knuth/sgb.html)
- **olympians** [Matt Riggott/IOC](https://www.flother.is/2017/olympic-games-data/)
- **penguins** — [Dr. Kristen Gorman](https://github.com/allisonhorst/palmerpenguins)
- **pizza** — A synthetic dataset. [Observable](https://observablehq.com/@observablehq/pizza-paradise-data)
- **weather** — [NOAA/Vega](https://github.com/vega/vega-datasets/blob/next/SOURCES.md#weathercsv)

For example, the line below creates a chart for the time series of AAPL closing prices over a span of five years:

```js echo
Plot.lineY(aapl, {x: "Date", y: "Close"}).plot({grid: true})
```

---

**What about performance?** Isn’t it slow to load all these datasets on every page? Thanks to static analysis, a dataset isn’t loaded unless you reference it. Referenced datasets are then served over the internet.

**Doesn’t this pollute the namespace?** These symbols are just default values. You are free to redefine them as you wish in your page.

```js echo
const cars = ["Lightning McQueen", "Mater", "Sally Carrera", "Doc Hudson", "Ramone", "Luigi", "Guido", "Fillmore", "Flo", "Sarge"];
```
