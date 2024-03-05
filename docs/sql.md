---
sql:
  gaia: ./lib/gaia-sample.parquet
---

# SQL

```sql echo
SELECT 1 + ${Math.random()}
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
