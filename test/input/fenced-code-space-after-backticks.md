# Fenced code with space after backticks

This should work according to CommonMark but currently fails:

``` sql
SELECT 1 + 2 AS result;
```

This works without the space:

```sql
SELECT 3 + 4 AS result;
```