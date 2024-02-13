# Shell script data loader examples

In Observable Framework, [data loaders](../loaders) can be created in shell scripts — they will be called with the system shell "sh".

## Parquet

The data loader below, `alt-fuel-stations.parquet.sh`, accesses data on alternative fuel stations from the [U.S. Department of Energy](https://catalog.data.gov/dataset/alternative-fueling-station-locations-422f2), simplifies to only California stations in SQL, then returns an Apache Parquet file.

Create a file in your project source root, with the .parquet.sh double extension (for example, `docs/my-data.parquet.sh`), then paste the code below to get started.

<!-- TODO this one needs explaining. -->

```sh
duckdb -csv :memory: << EOF

CREATE TABLE allp AS (
  FROM 'https://data.openei.org/files/106/04232015altfuelstations.csv'
);

CREATE TABLE cafuelstations AS (
  SELECT "Fuel Type Code" as Type,
  State,
  ZIP,
  Latitude,
  Longitude
  FROM allp
  WHERE State = 'CA'
);

COPY cafuelstations TO '$TMPDIR/cafuelstations.parquet' (FORMAT 'parquet', COMPRESSION 'GZIP');

EOF

# isatty
if [ -t 1 ]; then
  echo parquet file output at: $TMPDIR/cafuelstations.parquet
  echo "duckdb -csv :memory: \"SELECT * FROM '$TMPDIR/cafuelstations.parquet'\""
else
  cat $TMPDIR/cafuelstations.parquet
  rm $TMPDIR/cafuelstations.parquet
fi
```

<!-- TODO explain -->

```js echo
function absoluteFA(FA) {
  const {url} = FA;
  FA.url = async function() {
    return new URL(await url.apply(FA), document.location.href).href;
  }
  return FA;
}
```

```js echo
const caAltFuel = await DuckDBClient.of({
  fuelstations: absoluteFA(FileAttachment("alt-fuel-stations.parquet"))
});
```

```js echo
caAltFuel
```

```js echo
const fuelTable = caAltFuel.query("SELECT * FROM fuelstations");
```

```js echo
display(Inputs.table(fuelTable))
```

## JSON

Sometimes, all you need is `curl`!

The data loader below, `caltrans-districts.json.sh`, accesses geojson of CalTrans districts from the [California Open Data Portal](https://data.ca.gov/dataset/caltrans-districts/resource/668dacf7-e927-4ced-98aa-b495e79d40d2).

Create a file in your project source root, with the .json.sh double extension (for example, `docs/my-data.json.sh`), then paste the code below to get started.

```sh
curl 'https://gis.data.ca.gov/datasets/0144574f750f4ccc88749004aca6eb0c_0.geojson?outSR=%7B%22latestWkid%22%3A3857%2C%22wkid%22%3A102100%7D' \
  --compressed
```

`caltrans-districts.json` [routes](../loaders#routing) to the `caltrans-districts.json` data loader and reads its standard output stream.

```js echo
const caltrans = FileAttachment("caltrans-districts.json").json()
```

```js echo
caltrans
```

## CSV

Working in a shell script is flexible. Within the shell script, work in whatever you language you like to access and prep your data, then write to standard output.

The data loader example below, `penguin.csv.sh`, starts a Python script, accesses the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) data from a local file and does some basic wrangling, then writes a CSV to standard output.

Create a file in your project source root, with the .csv.sh double extension (for example, `docs/my-data.csv.sh`), then paste the code below to get started.

```sh
#!/bin/bash

# Start a Python script
python3 << END_PYTHON

# Import libraries
import sys
import pandas as pd
from sklearn.linear_model import LinearRegression

# Data access and wrangling
penguins = pd.read_csv("docs/data/penguins.csv")
penguins_size = penguins[["species", "body_mass_g", "flipper_length_mm", "sex"]]
penguins_complete = penguins_size.dropna(subset=["flipper_length_mm","body_mass_g"])

# Write pandas df as a CSV to standard output
penguins_complete.to_csv(sys.stdout)
END_PYTHON
```

`penguin.csv` [routes](../loaders#routing) to the `penguin.csv.sh` data loader and reads its standard output stream.

```js echo
const penguins = FileAttachment("penguin.csv").csv({typed: true})
```

```js echo
display(Inputs.table(penguins))
```
