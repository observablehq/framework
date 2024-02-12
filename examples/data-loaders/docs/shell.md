# Shell script data loader examples

In Observable Framework, you can write [data loaders](../loaders) in shell scripts. 

## Parquet (with DuckDB)

The data loader below, `alt-fuel-stations.parquet.sh`, accesses data on alternative fuel stations from the [U.S. Department of Energy](https://catalog.data.gov/dataset/alternative-fueling-station-locations-422f2), simplifies to only California stations in SQL, then returns an Apache Parquet file.

Copy and paste the code below into your own shell script data loader (with extension .parquet.sh in your project source root, typically `docs`), then update with your own data and code to get started.

<!-- TODO this one needs explaining. -->

```sh
duckdb -csv :memory: << EOF

CREATE TABLE allp AS (
  FROM 'https://data.openei.org/files/106/04232015altfuelstations.csv'
);

CREATE TABLE cafuelstations AS (
  SELECT "Fuel Type Code" as Type,
  State,
  ZIP as Zip,
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

## JSON (with `curl`)

Sometimes, all you need is `curl`! 

The data loader below, `caltrans-districts.json.sh`, accesses geojson of CalTrans districts from the [California Open Data Portal](https://data.ca.gov/dataset/caltrans-districts/resource/668dacf7-e927-4ced-98aa-b495e79d40d2).

Copy and paste the code below into your own shell script data loader (with extension .json.sh in your project source root, typically `docs`), then replace the url to access your own dataset.

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

## CSV (with Python)

Working in a shell script is flexible. Within the shell script, work in whatever you language you like to access and prep your data, then write to standard output. 

The data loader example below, `penguin.csv.sh`, starts a Python script, accesses and wrangles data from a local file, and writes a CSV to standard output. 

```sh
#!/bin/bash

# Start a Python script
python3 << END_PYTHON
import sys
import pandas as pd
from sklearn.linear_model import LinearRegression

penguins = pd.read_csv("docs/data/penguins.csv")

penguins_complete = penguins.dropna(subset=["culmen_length_mm", "culmen_depth_mm", "flipper_length_mm", "body_mass_g"])

penguins_complete.to_csv(sys.stdout)
END_PYTHON
```

```js echo
const penguins = FileAttachment("penguin.csv").csv({typed: true})
```

```js echo
display(Inputs.table(penguins))
```

