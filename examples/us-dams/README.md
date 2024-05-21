[Framework examples →](../)

# U.S. dams

View live: <https://observablehq.observablehq.cloud/framework-example-us-dams/>

This Observable Framework example explores data for over >90k dams in the United States from the [National Inventory of Dams](https://nid.sec.usace.army.mil/#/) (NID).

The homepage features a nationwide overview of dam locations, counts, and condition. The second page allows interactive exploration of dams by state.

### Charts and tables

Interactive maps are made with [deck.gl](https://deck.gl/). To create your own maps with deck.gl in Observable Framework, see our [documentation](https://observablehq.com/framework/lib/deckgl).

All other charts are built with [Observable Plot](https://observablehq.com/plot/).

Searchable tables are created with Observable Inputs, combining Inputs.search and Inputs.table.

### Static files

- Dam records are downloaded directly from the NID as a CSV (`src/data/nid-dams.csv`), then minimally wrangled with R in the `dam-simple.csv.R` data loader to produce the static file used in our dashboard (`dam-simple.csv`)

- County FIPS codes (`src/data/county_fips_master.csv`)are from: https://github.com/kjhealy/fips-codes/blob/master/county_fips_master.csv

- US state capitals and locations (`src/data/us-state-capitals.csvd`) are from: https://github.com/jasperdebie/VisInfo/blob/master/us-state-capitals.csv

- State and territory centroids (`src/data/states-centroids.csv`) are from: https://gist.github.com/rozanecm/29926a7c8132a0a25e3b12a24abdff86d (updated manually to include Puerto Rico and Guam)
