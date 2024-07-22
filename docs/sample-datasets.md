---
index: true
---

# Sample datasets

To help you get started, Observable Framework provides a handful of sample datasets by default. If you reference any of these variables (`aapl`, `alphabet`, `cars`, `citywages`, `diamonds`, `flare`, `industries`, `miserables`, `olympians`, `penguins`, `pizza`, or `weather`) in your code, their definition defaults to a Promise loading the corresponding file and returning the data. This makes it easier to get started, with simpler examples of charts and data transformations.

The source data files are downloaded on demand from the [@observablehq/sample-datasets](https://www.npmjs.com/package/@observablehq/sample-datasets) npm package, and served from your project’s cache. Note that these names are not “reserved”: you can define `alphabet` or `industries` as you see fit, if you need a variable or a function with that name in your project.

The following lists the provenance of each of the sample datasets:

## aapl

Yahoo! Finance <br>
https://finance.yahoo.com/lookup

## alphabet

_Cryptographical Mathematics_ by Robert Edward Lewand <br>
http://cs.wellesley.edu/~fturbak/codman/letterfreq.html

## cars

1983 ASA Data Exposition <br>
http://lib.stat.cmu.edu/datasets/

## citywages

The New York Times <br>
https://www.nytimes.com/2019/12/02/upshot/wealth-poverty-divide-american-cities.html

## diamonds

ggplot2 “diamonds” dataset <br>
https://github.com/tidyverse/ggplot2/blob/master/data-raw/diamonds.csv

## flare

Flare visualization toolkit package hierarchy <br>
https://observablehq.com/@d3/treemap

## industries

Bureau of Labor Statistics <br>
https://www.bls.gov/

## miserables

Character interactions in the chapters of “Les Miserables”, Donald Knuth, Stanford Graph Base <br>
https://www-cs-faculty.stanford.edu/~knuth/sgb.html

## olympians

Matt Riggott/IOC <br>
https://www.flother.is/2017/olympic-games-data/

## penguins

Dr. Kristen Gorman <br>
https://github.com/allisonhorst/palmerpenguins

## pizza

Pizza Paradise, Observable <br>
https://observablehq.com/@observablehq/pizza-paradise-data

## weather

NOAA/Vega <br>
https://www.ncdc.noaa.gov/cdo-web/datatools/records <br>
https://github.com/vega/vega-datasets/blob/master/scripts/weather.py
