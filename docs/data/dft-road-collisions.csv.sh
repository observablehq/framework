URL="https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-collision-1979-latest-published-year.csv"

# Use the data loader cache directory to store the downloaded data.
TMPDIR="docs/.observablehq/cache/"

# Download the data (if it’s not already in the cache).
if [ ! -f "$TMPDIR/dft-collisions.csv" ]; then
  curl -f "$URL" -o "$TMPDIR/dft-collisions.csv"
fi

# Generate a CSV file using DuckDB.
duckdb :memory: << EOF
COPY (
  SELECT longitude, latitude
  FROM read_csv_auto('$TMPDIR/dft-collisions.csv')
  WHERE accident_year = 2022
) TO STDOUT WITH (FORMAT 'csv');
EOF
