---
sql:
  gaia: ./lib/gaia-sample.parquet
---

# SQL

```sql id=[{random}]
SELECT 1 + ${Math.random()} AS "random"
```

```sql echo
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
