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