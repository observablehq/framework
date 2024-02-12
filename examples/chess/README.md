# Chess

This page displays chess rankings from the [International Chess Federation](http://ratings.fide.com/) for the past year.

View the [live project](https://observablehq.com/framework/examples/chess/).

## Data loaders

A single JavaScript data loader, `top-ranked-players.json.js`, accesses the data (in a Zip archive) from the site above, performs some basic wrangling, and writes the simplified snapshot of rankings in JSON format to standard out. 

## Charts

Bump charts are made with [Observable Plot](https://observablehq.com/plot/), and highlight changes in ratings for the top Women’s and Men’s chess players over time. 