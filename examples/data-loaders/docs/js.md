# JavaScript data loader examples

Observable Framework supports [data loaders](../loaders) written in JavaScript. Functions used in JavaScript data loaders must be imported.

## TSV

The data loader below (`us-electricity.tsv.js`) accesses data on US hourly electricity demand and generation from the [Energy Information Administration](https://www.eia.gov/opendata/), does some basic wrangling, and returns a tab-separated value file. 

Copy and paste the code below into your own JavaScript data loader (with extension .tsv.js in your project source root, typically `docs`), then update with your own data and JavaScript code to get started.

```js echo=true run=false
// Import d3 functions:
import {tsvFormat} from "d3-dsv";
import {json} from "d3-fetch";
import {timeDay, timeHour, utcDay} from "d3-time";
import {timeFormat, utcParse} from "d3-time-format";

// Time endpoints and conversion to EIA API expected format
const end = timeDay.offset(timeHour(new Date()), 1)
const start = timeHour(utcDay.offset(end, -7))
const convertDate = timeFormat("%m%d%Y %H:%M:%S")

// Access and wrangle data
const url = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=D&type[1]=DF&type[2]=NG&type[3]=TI&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`

const tidySeries = (response, id, name) => {
    let series = response[0].data
    return series.flatMap(s => {
        return s.VALUES.DATES.map((d, i) => {
            return {
                id: s[id],
                name: s[name],
                date: d,
                value: s.VALUES.DATA[i]
            }
        })
    })
}

const usElectricity = await json(url).then(response => {
    return tidySeries(response, "TYPE_ID", "TYPE_NAME")
});

// Write to stdout as TSV
process.stdout.write(tsvFormat(usElectricity));
```

`us-electricity.tsv` [routes](../loaders#routing) to the `us-electricity.tsv.js` data loader and reads its standard output stream.

```js echo
const usElectricity = FileAttachment("us-electricity.tsv").tsv();
```

```js echo
usElectricity
```

## SVG

Testing...not sure this is actually working. Loader is `test.csv.js`...

```js run=false
import { csv } from "d3-fetch";
import * as Plot from "@observablehq/plot";

const penguins = await csv("https://raw.githubusercontent.com/allisonhorst/palmerpenguins/main/inst/extdata/penguins.csv");

const chart = Plot.plot({
    marks: [
        Plot.dot(penguins, { x: "flipper_length_mm", y: "body_mass_g" })
    ]
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

## JSON