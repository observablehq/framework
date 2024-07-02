duckdb :memory: -c "
CREATE TABLE presse AS (
SELECT title
     , author
     , LPAD((REGEXP_EXTRACT(date, '1[0-9][0-9][0-9]') || '-01-01'), 10, '0')::DATE AS year
  FROM read_parquet(
    [('https://huggingface.co/datasets/PleIAs/French-PD-Newspapers/resolve/main/gallica_presse_{:d}.parquet').format(n) for n in range(1, 321)])
  ORDER BY title, author, year
);
COPY presse TO STDOUT (FORMAT 'parquet', COMPRESSION 'ZSTD', row_group_size 10000000);
"
