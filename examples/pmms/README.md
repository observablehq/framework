# Mortage tracker

This is an example Observable CLI project. It uses a data loader to track the mortage rates published by Freddie Mac — Federal Home Loan Mortgage Corporation — every week since 1971.

## Data loader

The `docs/data/pmms.csv.ts` loader fetches the data from Freddie Mac’s website. The original dataset is a csv file, with several columns that we don’t need and the classic American date format (month/day/year). The data loader restructures this dataset a little, by minimizing it to three columns (date, in ISO format; 30-year rate; 15-year rate).

## Charts

The cards and charts reinterpret the original elements of Freddie Mac’s [PMMS dashboard](https://www.freddiemac.com/pmms). We’re using Observable Plot to draw the charts. The chart code is simple enough to be directly inlined in the page’s markdown `docs/index.md`.
