[Framework examples →](../)

# Primary mortgage market survey

View live: <https://observablehq.observablehq.cloud/framework-example-mortgage-rates/>

This is an example Observable Framework project that tracks mortage rates published by Freddie Mac — Federal Home Loan Mortgage Corporation — every week since 1971.

## Data loader

A single TypeScript data loader `src/data/pmms.csv.ts` fetches the data from Freddie Mac’s website. The original dataset is a csv file, with several columns that we don’t need and the classic American date format (month/day/year). The data loader restructures this dataset a little, by minimizing it to three columns (date, in ISO format; 30-year rate; 15-year rate).

## Charts

The cards and charts reinterpret the original elements of Freddie Mac’s [PMMS dashboard](https://www.freddiemac.com/pmms). We use [Observable Plot](https://observablehq.com/plot/) to draw the charts. The chart code is simple enough to be directly inlined in the page’s markdown `src/index.md`. An interactive brush on the overview chart at the bottom of the page allows the user to focus on a section of the data.
