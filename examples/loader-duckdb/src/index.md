# DuckDB data loader

Here’s a data loader that uses a bash shell script to download a CSV file from Eurostat (the data portal from the statistical office of the European Union), then calls [DuckDB](https://duckdb.org/) to filter and reshape this data, and saves the result as an [Apache Parquet](https://observablehq.com/framework/lib/arrow#apache-parquet) file.

The example illustrates the technique by fetching statistics about education to modern foreign languages across Europe ([educ_uoe_lang01](https://ec.europa.eu/eurostat/databrowser/view/educ_uoe_lang01/default/table?lang=en&category=educ.educ_lang.educ_uoe_lang)).

The data loader lives in [`src/educ_uoe_lang01.parquet.sh`](./src/educ_uoe_lang01.parquet.sh).

Because the Eurostat API does not offer to compress data as part of the http response, but instead offers to send compressed data, we download it outside of DuckDB — here using [curl](https://curl.se/) then [gunzip](https://en.wikipedia.org/wiki/Gzip). The raw file obtained from Eurostat is saved to a temporary directory, which makes it much faster to iterate on the data loader when we want to tweak the query.

```sh
export CODE="educ_uoe_lang01"
export URL='https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/'$CODE'/?format=SDMX-CSV&compressed=true&i'

if [ ! -f "$TMPDIR/$CODE.csv.gz" ]; then curl "$URL" --output $TMPDIR/$CODE.csv.gz; fi
gunzip --keep $TMPDIR/$CODE.csv.gz

duckdb :memory: << EOF
COPY (
  SELECT *
  FROM read_csv('$TMPDIR/$CODE.csv')
  WHERE true
    AND TIME_PERIOD = 2019
    AND OBS_VALUE > 0 -- ignore zeros
    AND isced11 = 'ED2' -- lower secondary education
    AND unit = 'PC' -- ignore absolute numbers, keep percentages
    AND language != 'TOTAL' -- ignore total
    AND length(geo) = 2 -- ignore groupings such as EU_27
) TO '$TMPDIR/$CODE.parquet' (COMPRESSION gzip);
EOF
cat $TMPDIR/$CODE.parquet >&1  # Write output to stdout
rm $TMPDIR/$CODE.csv $TMPDIR/$CODE.parquet  # Clean up
```

<div class="note">

To run this data loader, you’ll need to install the `duckdb` binary, as well as `curl` and `gunzip` if they are not already available on your system.

</div>

The above data loader lives in `educ_uoe_lang01.parquet.sh`, so we can load the data as `educ_uoe_lang01.parquet`. The `FileAttachment.parquet` method parses the file and returns a promise to an Arrow table.

```js echo
const languages = FileAttachment("educ_uoe_lang01.parquet").parquet();
```

We can display this dataset with Inputs.table:

```js echo
Inputs.table(languages)
```

We can also make a quick chart of the state of learning of modern foreign languages in European countries using [Observable Plot](https://observablehq/com/plot/); note that the stacked percentages go above 100% in most countries because a lot of pupils learn at least two foreign languages. Ireland (IE) is the only exception (as English is not taught as a foreign language).

```js echo
const domain = d3.groupSort(languages, v => -d3.sum(v, d => d.OBS_VALUE), d => d.language)
      .slice(0, 9).concat("others");

const chart = Plot.plot({
  y: {axis: "right", grid: true},
  color: {legend: true, domain, unknown: "grey"},
  marks: [
    Plot.barY(languages, {
      x: "geo",
      y: "OBS_VALUE",
      fill: "language",
      order: "sum",
      sort: {x: "-y"},
      tip: true
    })
  ]
});

display(chart);
```

<details>
  <summary>Code book</summary>

For reference, here are the codes used for countries and languages:

<div style="max-width: 250px">

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

</details>
