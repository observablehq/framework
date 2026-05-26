---
sql:
  presse: data/presse.parquet
---

# Gazette

Explore 3 million newspapers **by title**. Type in words such as “jeune”, “révolution”, “république”, “matin”, “soir”, “humanité”, “nouvelle”, “moderne”, “femme”, “paysan”, “ouvrier”, “social”, “résistance” etc. to see different historical trends.

```js
const search = view(
  Inputs.text({ type: "search", value: "gazette", submit: true })
);
```

```js
const chart = Plot.plot({
  x: { type: "utc", nice: true },
  y: {
    label: `Share of titles matching ${search}`,
    tickFormat: "%",
  },
  marks: [
    Plot.ruleY([0, 0.01], { stroke: ["currentColor"] }),
    Plot.areaY(base, {
      x: "year",
      y: ({ year, total }) => gazette.get(year) / total,
      fillOpacity: 0.2,
      curve: "step",
    }),
    Plot.lineY(base, {
      x: "year",
      y: ({ year, total }) => gazette.get(year) / total,
      curve: "step",
    }),
  ],
});

display(chart);
```

I called this page “Gazette” because I was surprised that most of the corpus in the earlier years had a title containing this word. The query uses a case-insensitive [REGEXP_MATCHES](https://duckdb.org/docs/archive/0.9.2/sql/functions/patternmatching) operator to count occurrences; you can query for example “socialis[tm]e” to match both “socialiste” and “socialisme”.

```sql id=results
SELECT year
     , COUNT() c
  FROM presse
 WHERE REGEXP_MATCHES(STRIP_ACCENTS(title), STRIP_ACCENTS(${search}), 'i')
 GROUP BY year
```

```js
// A Map for fast retrieval—precisely an InternMap, indexed by Date
const gazette = new d3.InternMap(Array.from(results, ({ year, c }) => [year, c]));
```

```sql id=base
-- base (denominator: count by year) --
  SELECT year
       , COUNT(*)::int total
    FROM presse
   WHERE year > '1000'
GROUP BY year
ORDER BY year
```
