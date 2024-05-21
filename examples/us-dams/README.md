[Framework examples →](../)

# U.S. dams

View live: <https://observablehq.observablehq.cloud/framework-example-us-dams/>

This Observable Framework example explores data for over >90k dams in the United States from the [National Inventory of Dams](https://nid.sec.usace.army.mil/#/) (NID).

The pages feature nationwide and state-by-state summaries of dam locations, highlighting dam conditions and hazard assessment.

Interactive maps are created with [deck.gl](https://deck.gl/)). To create your own maps with deck.gl in Observable Framework, see our [documentation](https://observablehq.com/framework/lib/deckgl). All other charts built with [Observable Plot](https://observablehq.com/plot/), and searchable tables are created with Observable Inputs by combining [Inputs.search and Inputs.table](https://observablehq.com/framework/inputs/search).

## Implementation

```
.
├── README.md
├── observablehq.config.js
├── package.json
└── src
    ├── data
    │   ├── county_fips_master.csv
    │   ├── dam-simple.csv.R
    │   ├── nid-dams.csv
    │   ├── states-centroids.csv
    │   ├── us-counties-10m.json
    │   ├── us-state-capitals.csv
    │   └── us-states-json.js
    ├── by-state.md
    └── index.md
```

The R data loader (`dam-simple.csv.R`) produces the `dam-simple.csv` file used in both pages. To run the data loader, you will need both [R](https://www.r-project.org/) and the [tidyverse](https://www.tidyverse.org/) package installed, _e.g._ with `install.packages("tidyverse")`.

### Data

- Dam records are downloaded directly from the NID as a CSV (`src/data/nid-dams.csv`), then minimally wrangled with R in the `dam-simple.csv.R` data loader to produce the static file used in our dashboard (`dam-simple.csv`)

- County FIPS codes (`src/data/county_fips_master.csv`)are from: https://github.com/kjhealy/fips-codes/blob/master/county_fips_master.csv

- US state capitals and locations (`src/data/us-state-capitals.csv`) are from: https://github.com/jasperdebie/VisInfo/blob/master/us-state-capitals.csv

- State and territory centroids (`src/data/states-centroids.csv`) are from: https://gist.github.com/rozanecm/29926a7c8132a0a25e3b12a24abdff86d (updated manually to include Puerto Rico and Guam)

- County-level spatial polygons from `us-counties-10m.son` are simplified and wrangled in the `us-states.json.js` data loader, producing the `us-states.json` file read into both dashboard pages
