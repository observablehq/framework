# U.S. electricity grid

This is an example Observable Framework project, based on parts of the US Energy Information Administration’s <a href="https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/US48/US48">Hourly Electric Grid Monitor</a> dashboard.

Visit <a href="https://www.eia.gov/electricity/gridmonitor/about">About the EIA-930 data</a> to learn more about data collection and quality, the US electric grid, and balancing authorities responsible for nationwide electricity interchange.

View the [live project](https://observablehq.com/framework/examples/eia/).

Move the time slider above the map to see how the “[duck curve](https://en.wikipedia.org/wiki/Duck_curve)” of electricity demand varies during the day in different regions, with greater demand in before- and after-work hours, and lower demand during typical working hours.

## Data loaders

The (near) real-time hourly electric data needed to create this dashboard is loaded from several API endpoints on the EIA website. These endpoints require an API key that can be [requested from the website](https://www.eia.gov/opendata/documentation.php). To connect the data loaders to the EIA API, we add an `.env` file at the root of the project directory containing the API key:

```
EIA_KEY=xxxxxxxxxxxx
```

You may want to add `.env` to a `.gitignore` file in your project root to keep the key from being exposed.

Three data loaders access US electric grid hourly data from the EIA:

- `country-interchange.csv.js`: Hourly electricity interchange between the U.S., Canada, and Mexico
- `us-demand.csv.js`: Total electricity generation, demand, and forecasted demand for the U.S. (lower 48 states) - `eia-ba-hourly.csv.js`: Hourly electricity demand by balancing authority

The above data loaders access the updated data from the API at build time, minimize the original datasets by retaining only rows and columns used in dashboard visualizations, then export the data snapshots as csv files.

The base map is created in the `us-states.json.js` data loader, which uses [TopoJSON](https://github.com/topojson/topojson) to extract the two features we want to draw (the outline and the border mesh) from `us-counties-10m.json` and minimizes the file size.

### Static files

Several static files used in the dashboard were downloaded from the EIA Hourly Electric Grid Monitor [About page](https://www.eia.gov/electricity/gridmonitor/about) (EIA-930 data reference tables), and not created or processed in data loaders. These files contain reference information that expect to remain unchanged, including: 

- `eia-bia-reference.csv`: Reference information about balancing authority name, time zone, region, country, etc.
- `eia-connections-reference.csv`: Reference information about connections between balancing authorities

## Charts

The charts and map are drawn with [Observable Plot](https://observablehq.com/plot/), and saved as components in `components/charts.js` and `components/map.js` to simplify our layout code in `index.md`. 

## Thanks

Special thanks to <a href="https://observablehq.com/@enjalot">Ian Johnson</a> for early explorations of this dataset.
