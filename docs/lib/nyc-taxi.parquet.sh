duckdb :memory: << EOF
-- Load spatial extension
INSTALL spatial; LOAD spatial;

-- Project coordinates, following the example at https://github.com/duckdb/duckdb_spatial
CREATE TEMP TABLE rides AS SELECT
  pickup_datetime::TIMESTAMP AS datetime,
  ST_Transform(ST_Point(pickup_latitude, pickup_longitude), 'EPSG:4326', 'EPSG:32118') AS pick,
  ST_Transform(ST_Point(dropoff_latitude, dropoff_longitude), 'EPSG:4326', 'EPSG:32118') AS drop
FROM 'https://uwdata.github.io/mosaic-datasets/data/nyc-rides-2010.parquet';

-- Write output parquet file
COPY (SELECT
  HOUR(datetime) + MINUTE(datetime) / 60 AS time,
  ST_X(pick)::INTEGER AS px, -- extract pickup x-coord
  ST_Y(pick)::INTEGER AS py, -- extract pickup y-coord
  ST_X(drop)::INTEGER AS dx, -- extract dropff x-coord
  ST_Y(drop)::INTEGER AS dy  -- extract dropff y-coord
FROM rides
ORDER BY 2,3,4,5,1 -- optimize output size by sorting
) TO STDOUT (FORMAT 'parquet', COMPRESSION 'zstd', ROW_GROUP_SIZE 10_000_000);
EOF
