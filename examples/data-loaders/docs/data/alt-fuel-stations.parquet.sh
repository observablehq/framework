duckdb -csv :memory: << EOF

CREATE TABLE allp AS (
  FROM 'https://data.openei.org/files/106/alt_fuel_stations%20%28Jul%2029%202021%29.csv'
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