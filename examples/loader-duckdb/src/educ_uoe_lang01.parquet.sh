export CODE="educ_uoe_lang01"
export URL="https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/$CODE/?format=SDMX-CSV&compressed=true&i"

# create a temp directory to download and process the data
export TMPDIR="src/.observablehq/cache/loaders" 
mkdir -p $TMPDIR

if [ ! -f "$TMPDIR/$CODE.csv" ]; then
  curl "$URL" --output $TMPDIR/$CODE.csv.gz
  gunzip $TMPDIR/$CODE.csv.gz
fi

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
) TO '$TMPDIR/$CODE.parquet' (COMPRESSION gzip);
EOF
cat $TMPDIR/$CODE.parquet  # Write output to stdout
