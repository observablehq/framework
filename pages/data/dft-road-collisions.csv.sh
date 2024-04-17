test -f docs/.observablehq/cache/dft-collisions.csv || curl -o docs/.observablehq/cache/dft-collisions.csv 'https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-collision-1979-latest-published-year.csv'
duckdb -c "COPY (SELECT longitude, latitude FROM read_csv_auto('docs/.observablehq/cache/dft-collisions.csv') WHERE accident_year = 2022) TO STDOUT WITH (FORMAT CSV);"
