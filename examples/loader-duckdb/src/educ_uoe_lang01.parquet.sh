CODE="educ_uoe_lang01"
URL="https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/$CODE/?format=SDMX-CSV&i"

# Use the data loader cache directory to store the downloaded data.
TMPDIR="src/.observablehq/cache/"

# Download the data (if it’s not already in the cache).
if [ ! -f "$TMPDIR/$CODE.csv" ]; then
  curl -f "$URL" -o "$TMPDIR/$CODE.csv"
fi

# Generate a Parquet file using DuckDB.
duckdb :memory: << EOF
COPY (
  SELECT *
  FROM read_csv('$TMPDIR/$CODE.csv')
  WHERE true
    AND TIME_PERIOD = 2019 -- a good year in terms of data quality
    AND OBS_VALUE > 0 -- filter out zeros
    AND isced11 = 'ED2' -- lower secondary education
    AND unit = 'PC' -- ignore absolute numbers, keep percentages
    AND language != 'TOTAL' -- ignore total
    AND length(geo) = 2 -- ignore groupings such as EU_27
) TO STDOUT (FORMAT 'parquet', COMPRESSION 'gzip');
EOF
