# U.S. electricity grid

This is an example Observable Framework project, based on parts of the US Energy Information Administration’s <a href="https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48">Hourly Electric Grid Monitor</a> dashboard.

Visit <a href="https://www.eia.gov/electricity/gridmonitor/about">About the EIA-930 data</a> to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.

## Data loaders

The data needed to create this dashboard is loaded from several API endpoints on the EIA website. These endpoints require an API key that we can [request from the website](https://www.eia.gov/opendata/documentation.php). We store it in our project’s `.env` file that contains a single line:

```
EIA_KEY=xxxxxxxxxxx
```

The data loaders minimize the datasets by retaining only the rows and columns of information used in the visualizations, and export the data snapshots as csv files.

The map and charts are drawn with [Observable Plot](https://observablehq/com/plot).

The base map is a data loader that uses TopoJSON to extract the two features we want to draw (the outline and the border mesh) and minimize the file size.

Move the time slider to see how the “[duck curve](https://en.wikipedia.org/wiki/Duck_curve)” of electricity production and consumption varies during the day.

## Thanks

Special thanks to <a href="https://observablehq.com/@enjalot">Ian Johnson</a> for early explorations of this dataset.
