# DuckDB data loader

Here’s a shell script data loader that uses curl to download a CSV file, then uses the [DuckDB CLI](https://duckdb.org/docs/api/cli/overview.html) to filter it, and finally outputs the result as a [Apache Parquet](https://observablehq.com/framework/lib/arrow#apache-parquet) file.

```sh
CODE="educ_uoe_lang01"
URL="https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/$CODE/?format=SDMX-CSV&i"

# Use the data loader cache directory to store the downloaded data.
TMPDIR="src/.observablehq/cache/"

# Download the data (if it’s not already in the cache).
if [ ! -f "$TMPDIR/$CODE.csv" ]; then
  curl "$URL" -o "$TMPDIR/$CODE.csv"
fi

# Generate a Parquet file using DuckDB.
duckdb :memory: << EOF
COPY (
  SELECT *
  FROM read_csv('$TMPDIR/$CODE.csv')
  WHERE true
    AND TIME_PERIOD = 2019 -- a good year in terms of data quality
    AND OBS_VALUE > 0 -- filter out zeros
    AND isced11 = 'ED2' -- lower secondary education
    AND unit = 'PC' -- ignore absolute numbers, keep percentages
    AND language != 'TOTAL' -- ignore total
    AND length(geo) = 2 -- ignore groupings such as EU_27
) TO STDOUT (FORMAT 'parquet', COMPRESSION 'gzip');
EOF
```

<div class="note">

To run this data loader, you’ll need to install curl and the DuckDB CLI if they are not already installed on your system.

</div>

The example data is statistics about modern foreign language education ([educ_uoe_lang01](https://ec.europa.eu/eurostat/databrowser/view/educ_uoe_lang01/default/table?lang=en&category=educ.educ_lang.educ_uoe_lang)) from Eurostat, the data portal of the statistical office of the European Union. To make it faster to iterate on the data — for example to change the education level or the time period — we save the downloaded data to Framework’s cache folder.

The above data loader lives in `educ_uoe_lang01.parquet.sh`, so we can load the data as `educ_uoe_lang01.parquet`. The `FileAttachment.parquet` method parses the file and returns a promise to an Arrow table.

```js echo
const languages = FileAttachment("educ_uoe_lang01.parquet").parquet();
```

We can display this dataset with Inputs.table:

```js echo
Inputs.table(languages)
```

We can also make a quick chart of most-frequently taught modern foreign languages in Europe using [Observable Plot](https://observablehq.com/plot/); note that the stacked percentages go above 100% in most countries because many pupils learn at least two foreign languages. Ireland (IE) is the only exception as English is not taught as a foreign language.

```js
Plot.plot({
  x: {axis: "top", grid: true},
  color: {legend: true, unknown: "grey"},
  marks: [
    Plot.barX(languages, {
      x: "OBS_VALUE",
      y: "geo",
      fill: "language",
      order: "-sum",
      sort: {y: "-x", color: {value: "width", reduce: "sum", limit: 9}},
      tip: true
    })
  ]
})
```

For reference, here are the codes used for countries and languages:

<div class="grid grid-cols-2" style="grid-auto-rows: auto; max-width: 640px;">
  <div>

| code | country                |
| ---- | ---------------------- |
| BE   | Belgium                |
| BG   | Bulgaria               |
| CZ   | Czechia                |
| DK   | Denmark                |
| DE   | Germany                |
| EE   | Estonia                |
| IE   | Ireland                |
| EL   | Greece                 |
| ES   | Spain                  |
| FR   | France                 |
| HR   | Croatia                |
| IT   | Italy                  |
| CY   | Cyprus                 |
| LV   | Latvia                 |
| LT   | Lithuania              |
| LU   | Luxembourg             |
| HU   | Hungary                |
| MT   | Malta                  |
| NL   | Netherlands            |
| AT   | Austria                |
| PL   | Poland                 |
| PT   | Portugal               |
| RO   | Romania                |
| SI   | Slovenia               |
| SK   | Slovakia               |
| FI   | Finland                |
| SE   | Sweden                 |
| IS   | Iceland                |
| LI   | Liechtenstein          |
| NO   | Norway                 |
| UK   | United Kingdom         |
| BA   | Bosnia and Herzegovina |
| MK   | North Macedonia        |
| AL   | Albania                |
| RS   | Serbia                 |

  </div>
  <div>

| code | language       |
| ---- | -------------- |
| BUL  | Bulgarian      |
| SPA  | Spanish        |
| CZE  | Czech          |
| DAN  | Danish         |
| GER  | German         |
| EST  | Estonian       |
| GRE  | Greek          |
| ENG  | English        |
| FRE  | French         |
| GLE  | Irish          |
| HRV  | Croatian       |
| ITA  | Italian        |
| LAV  | Latvian        |
| LIT  | Lithuanian     |
| HUN  | Hungarian      |
| MLT  | Maltese        |
| DUT  | Dutch; Flemish |
| POL  | Polish         |
| POR  | Portuguese     |
| RUM  | Romanian       |
| SLO  | Slovak         |
| SLV  | Slovenian      |
| FIN  | Finnish        |
| SWE  | Swedish        |
| ARA  | Arabic         |
| CHI  | Chinese        |
| JPN  | Japanese       |
| RUS  | Russian        |
| OTH  | Other          |
| UNK  | Unknown        |

  </div>
</div>
