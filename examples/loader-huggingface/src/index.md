---
sql:
  presse: data/presse.parquet
---

# French public domain newspapers

## A quick glance at 3&nbsp;million periodicals

<p class=signature>by <a href="https://observablehq.com/@fil">Fil</a>

This new fascinating dataset just dropped on Hugging Face: [French public domain newspapers](https://huggingface.co/datasets/PleIAs/French-PD-Newspapers) 🤗 references about **3&nbsp;million newspapers and periodicals** with their full text OCR’ed and some meta-data.

The data is stored in 320 large parquet files. The data loader for this [Observable framework](https://observablehq.com/framework) project uses [DuckDB](https://duckdb.org/) to read these files (altogether about 200GB) and combines a minimal subset of their metadata — title and year of publication, most importantly without the text contents&nbsp;—, into a single highly optimized parquet file. This takes only about 1 minute to run in a hugging-face Space.

The resulting file is small enough (and incredibly so: the file weighs about 560kB, _only 1.5 bits per row!_), that we can load it in the browser and create “live” charts with [Observable Plot](https://observablehq.com/plot).

In this project, I’m exploring two aspects of the dataset:

- As I played with the titles, I saw that the word “gazette” was quite frequent in the 17th Century. An exploration of the words used in the titles is on the page [gazette](gazette).

- A lot of publications stopped or started publishing during the second world war. Explored in [resistance](resistance).

This page summarizes the time distribution of the data:

```sql id=dates echo
-- dates --
SELECT year FROM presse WHERE year >= '1000'
```

_Note: due to the date pattern matching I’m using, unknown years are marked as 0000. Hence the filter above._

The chart below indicates that the bulk of the contents collected in this database was published between 1850 and 1950. It’s obviously not that the _presse_ stopped after 1950, but because most of the printed world after that threshold year is still out of reach of researchers, as it is “protected” by copyright or _droit d’auteur._

${Plot.rectY(dates, Plot.binX({ y: "count" }, { x: "year", interval: "5 years" })).plot({ marginLeft: 60 })}

```js echo run=false
Plot.plot({
  marks: [
    Plot.rectY(
      dates,
      Plot.binX({ y: "count" }, { x: "year", interval: "5 years" })
    ),
  ],
});
```

<p class="small note" style="margin-top: 3em;" label=Thanks>Radamés Ajna, Sylvain Lesage and the 🤗 team helped me set up the Dockerfile. Éric Mauvière suggested many performance improvements.

<style>

.signature a[href] {
  color: var(--theme-foreground)
}

.signature {
  text-align: right;
  font-size: small;
}

.signature::before {
  content: "◼︎ ";
}

</style>
