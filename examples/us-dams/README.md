[Framework examples →](../)

# U.S. dams

View live: <https://observablehq.observablehq.cloud/framework-example-us-dams/>

This Observable Framework example explores data for 90,000+ dams in the United States from the [National Inventory of Dams](https://nid.sec.usace.army.mil/) (NID).

The pages feature nationwide and state-by-state summaries of dam locations, highlighting dam conditions and hazard assessment.

Interactive maps are created with [deck.gl](https://deck.gl/). To create your own maps with deck.gl in Observable Framework, see our [documentation](https://observablehq.com/framework/lib/deckgl). All other charts are built with [Observable Plot](https://observablehq.com/plot/), and searchable tables are created with Observable Inputs by combining [Inputs.search and Inputs.table](https://observablehq.com/framework/inputs/search).

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
    │   └── us-state-capitals.csv
    ├── by-state.md
    └── index.md
```

The R data loader `dam-simple.csv.R` accesses data directly from the NID (at https://nid.sec.usace.army.mil/api/nation/csv) and generates the `dam-simple.csv` snapshot used in both pages. To run the data loader, you need to have [R](https://www.r-project.org/) installed, along with the [data.table](https://github.com/Rdatatable/data.table), [dplyr](https://github.com/tidyverse/dplyr), and [readr](https://github.com/tidyverse/readr) packages (e.g. with `install.packages("dplyr")`).

### Data

- Dam records are accessed from the NID API as a CSV, then minimally wrangled by the `dam-simple.csv.R` data loader to produce the static file with dam records used in our dashboard (`dam-simple.csv`)

- County FIPS codes (`src/data/county_fips_master.csv`) are from https://github.com/kjhealy/fips-codes/blob/master/county_fips_master.csv

- US state capitals and locations (`src/data/us-state-capitals.csv`) are from https://github.com/jasperdebie/VisInfo/blob/master/us-state-capitals.csv

- County, state, and nation-level spatial polygons are accessed from the [us-atlas](https://www.npmjs.com/package/us-atlas?activeTab=readme) repository
