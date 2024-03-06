---
sql:
  gaia: "./lib/gaia-sample.parquet"
  foo: ./foo.csv
---

# SQL

Observable Framework includes built-in support for client-side SQL using [DuckDB](./lib/duckdb). You can use SQL to query data from [CSV](./lib/csv), [TSV](./lib/csv), JSON, [Apache Arrow](./lib/arrow), and [Apache Parquet](./lib/arrow#apache-parquet) files.

```yaml
---
sql:
  gaia: ./lib/gaia-sample.parquet
---
```

```sql
SELECT * FROM foo;
```

```sql id=[{random}]
SELECT 1 + ${Math.random()} AS "random"
```

```sql id=bins echo
SELECT
  floor(ra / 2) * 2 + 1 AS ra,
  floor(dec / 2) * 2 + 1 AS dec,
  count() AS count
FROM
  gaia
GROUP BY
  1,
  2
```

```js echo
Plot.plot({
  aspectRatio: 1,
  x: {domain: [0, 360]},
  y: {domain: [-90, 90]},
  marks: [
    Plot.frame({fill: 0}),
    Plot.raster(bins, {
      x: "ra",
      y: "dec",
      fill: "count",
      width: 360 / 2,
      height: 180 / 2,
      imageRendering: "pixelated"
    })
  ]
})
```
