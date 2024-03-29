# Mortage tracker

This is an example Observable Framework project that tracks mortage rates published by Freddie Mac — Federal Home Loan Mortgage Corporation — every week since 1971.

View the [live project](https://observablehq.com/framework/examples/mortgage-rates/). 
View the [interactive version](https://observablehq.com/framework/examples/mortgage-rates/interactive). 

## Data loader

A single TypeScript data loader `docs/data/pmms.csv.ts` fetches the data from Freddie Mac’s website. The original dataset is a csv file, with several columns that we don’t need and the classic American date format (month/day/year). The data loader restructures this dataset a little, by minimizing it to three columns (date, in ISO format; 30-year rate; 15-year rate).

## Charts

The cards and charts reinterpret the original elements of Freddie Mac’s [PMMS dashboard](https://www.freddiemac.com/pmms). We use [Observable Plot](https://observablehq.com/plot/) to draw the charts. The chart code is simple enough to be directly inlined in the page’s markdown `docs/index.md`.

## Interactive version

There is also [an interactive version](https://observablehq.com/framework/examples/mortgage-rates/interactive) that adds control over the year being shown. See [this blog post to read about how it was done](https://observablehq.com/blog/how-to-add-interactivity-observable-framework-dashboard).