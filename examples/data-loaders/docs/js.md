# JavaScript data loader examples

Observable Framework supports [data loaders](../loaders) written in JavaScript. These data loaders run in the most standard way—using `node --no-warnings=ExperimentalWarning {script-name}` for JavaScript (.js) data loaders, and `tsx {script-name}` for TypeScript (.ts) data loaders. To test a data loader, you can run the relevant command directly in a shell.

Because data loaders run in this standard environment, they have to be written as standard node (or tsx) scripts. For instance, they have to import explicitly every library that they use.

## TSV

The data loader below (`us-electricity.tsv.js`) accesses data on US hourly electricity demand and generation from the [Energy Information Administration](https://www.eia.gov/opendata/), does some basic wrangling, and returns a tab-separated value file.

Create a file in your project source root, with the .tsv.js double extension (for example, `docs/my-data.csv.js`), then paste the JavaScript code below to get started.

```js echo=true run=false
// Import d3 functions:
import * as d3 from "d3";

// Time endpoints and conversion to EIA API expected format
const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);
const start = d3.timeHour(d3.utcDay.offset(end, -7));
const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S");

// Access and wrangle data
const url = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=D&type[1]=DF&type[2]=NG&type[3]=TI&start=${convertDate(
  start
)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`;

const tidySeries = (response, id, name) => {
  let series = response[0].data;
  return series.flatMap((s) => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        id: s[id],
        name: s[name],
        date: d,
        value: s.VALUES.DATA[i]
      };
    });
  });
};

const usElectricity = await d3.json(url).then((response) => {
  return tidySeries(response, "TYPE_ID", "TYPE_NAME");
});

// Write to stdout as TSV
process.stdout.write(d3.tsvFormat(usElectricity));
```

`us-electricity.tsv` [routes](../loaders#routing) to the `us-electricity.tsv.js` data loader and reads its standard output stream.

```js echo
const usElectricity = FileAttachment("us-electricity.tsv").tsv();
```

```js echo
usElectricity
```

## SVG

<!-- TODO UPDATE this isn't done. Loader is `test.csv.js`... -->

Create a file in your project source root, with the .svg.js double extension (for example, `docs/my-svg.svg.js`), then paste the JavaScript code below to get started.

```js run=false
import {csv} from "d3-fetch";
import * as Plot from "@observablehq/plot";

const penguins = await csv(
  "https://raw.githubusercontent.com/allisonhorst/palmerpenguins/main/inst/extdata/penguins.csv"
);

const chart = Plot.plot({
  marks: [Plot.dot(penguins, {x: "flipper_length_mm", y: "body_mass_g"})]
});

process.stdout.write(chart);
```

```js echo
import { parseFromString } from 'npm:dom-parser';
```

```js echo
const testing = FileAttachment("test.svg")
```

```js echo
testing
```

```js echo
const doc = parseFromString(testing, "image/svg+xml");
```

```js echo
doc
```

### TEST2 SVG

```js echo
const testing2 = FileAttachment("test2.svg")
```

```js echo
testing2
```

```js echo
const doc2 = parseFromString(testing, "image/svg+xml");
```

```js echo
doc2
```

```js echo
const svg = d3.select(doc2.documentElement).remove();
```

```js echo
svg
```

Grrr.

## JSON
