---
sql:
  presse: data/presse.parquet
---

# Résistance

During the second world war the nazis occupied the northern half of France, and the collaborationist governement of Pétain was left to rule over the southern half (the “[zone libre](https://fr.wikipedia.org/wiki/Zone_libre)”). A lot of newspapers at that time were closed, others submitted to the occupiers (some even enthusiastically collaborated). At the same time, a range of clandestine publications started circulating, often associated with the resistance movements. When the country was Liberated in 1944, the most outrageously collaborationist press was dismantled, other newspapers changed their names and were sometimes taken over by new teams of resistance journalists. The most famous case is “Le Temps,” a daily newspaper that had been [publishing since 1861](<https://fr.wikipedia.org/wiki/Le_Temps_(quotidien_fran%C3%A7ais,_1861-1942)>) and had closed in 1942. Although not a collaborationist newspaper, it was not allowed to reopen, and its assets were transferred to create “Le Monde” on 19&nbsp;December 1944, under Hubert Beuve-Méry.

```sql id=letemps echo
-- letemps --
  SELECT year
       , count(*) "count"
    FROM presse
   WHERE title = 'Le Temps'
     AND year > DATE '1000-01-01'
   GROUP BY ALL
```

```js echo
display(
  Plot.plot({
    caption: "Number of issues of Le Temps in the dataset, per year",
    x: { nice: true },
    y: { grid: true },
    marks: [
      Plot.ruleY([0]),
      Plot.rectY(letemps, { y: "count", x: "year", interval: "year" }),
    ],
  })
);
```

(Unfortunately, “Le Monde” is not part of the dataset.)

The number of titles that stopped or started publishing exploded in those fatal years. Note that many of these publications were short-lived, such as this example picked at random in the dataset: [Au-devant de la vie. Organe de l'Union des jeunes filles patriotes (UJFP), Région parisienne](https://gallica.bnf.fr/ark:/12148/bpt6k76208732?rk=21459;2). While the the UJFP (a resistance organisation of communist young women) published several titles during the war, only one issue was distributed under this title.

```sql id=years echo
-- years --
  SELECT title
       , MIN(year) AS start
       , MAX(year) AS end
    FROM presse
   GROUP BY 1
```

```js echo
display(
  Plot.plot({
    color: { legend: true },
    marks: [
      Plot.rectY(
        years,
        Plot.binX(
          { y: "count" },
          {
            filter: (d) =>
              d.start?.getUTCFullYear() >= 1930 &&
              d.start?.getUTCFullYear() <= 1955,
            x: "start",
            fill: () => "started",
            interval: "year",
          }
        )
      ),
      Plot.rectY(
        years,
        Plot.binX(
          { y: "count" },
          {
            filter: (d) =>
              d.end?.getUTCFullYear() >= 1930 &&
              d.end?.getUTCFullYear() <= 1955,
            x: "end",
            fill: () => "ended",
            mixBlendMode: "multiply",
            interval: "year",
          }
        )
      ),
      Plot.ruleY([0]),
    ],
  })
);
```

Let’s focus on the ${start1944.length} publications that started publishing in 1944, and extract their titles and authors:

```sql id=start1944 echo
  SELECT title
       , IFNULL(NULLIF(author, 'None'), '') AS author
       , YEAR(MIN(year)) AS start
       , YEAR(MAX(year)) AS end
       , COUNT(*) AS issues
   FROM presse
   GROUP BY ALL
   HAVING start = 1944
   ORDER BY issues DESC
```

```js
display(
  Inputs.table(start1944, { format: { start: (d) => d, end: (d) => d } })
);
```

Going through these titles, one gets a pretty impressive picture of the publishing activity in this extreme historic period.
