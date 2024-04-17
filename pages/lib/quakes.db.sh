duckdb docs/lib/quakes.db -c "CREATE TABLE events AS (FROM 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.csv');"
