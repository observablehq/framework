# Shell script data loader examples

In Observable Framework, [data loaders](../loaders) can be created in shell scripts. 

## Parquet

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


