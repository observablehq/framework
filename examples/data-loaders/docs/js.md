# JavaScript data loader examples

Observable Framework supports [data loaders](../loaders) written in JavaScript. These data loaders run in the most standard way—using `node --no-warnings=ExperimentalWarning {script-name}` for JavaScript (.js) data loaders, and `tsx {script-name}` for TypeScript (.ts) data loaders. To test a data loader, you can run the relevant command directly in a shell.

Because data loaders run in this standard environment, they have to be written as standard node (or tsx) scripts. For instance, they have to import explicitly every library that they use.

## TSV

The data loader below (`us-electricity.tsv.js`) accesses data on US hourly electricity demand and generation from the [Energy Information Administration](https://www.eia.gov/opendata/), does some basic wrangling, and returns a tab-separated value file.

Create a file in your project source root, with the .tsv.js double extension (for example, `docs/my-data.tsv.js`), then paste the JavaScript code below to get started.

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

Access the output of the data loader (here, `us-electricity.tsv`) using [`FileAttachment`](../javascript/files):

```js echo
const usElectricity = FileAttachment("us-electricity.tsv").tsv();
```

`us-electricity.tsv` [routes](../loaders#routing) to the `us-electricity.tsv.js` data loader and reads its standard output stream.

```js echo
usElectricity
```

## JSON

The data loader below (`magic.json.js`) accesses Magic the Gathering card data from the [Scryfall API](https://scryfall.com/docs/api), does some basic wrangling, and returns a JSON.

Create a file in your project source root, with the .json.js double extension (for example, `docs/my-data.json.js`), then paste the JavaScript code below to get started.

```js run=false
// Import d3 functions:
import * as d3 from "d3";

// Access and wrangle data
const url = "https://api.scryfall.com/cards/search?order=cmc&q=c:red%20pow=3";

const magicCards = await d3.json(url);

const magicCardsData = magicCards.data.map((d) => ({
  name: d.name,
  release: d.released_at,
  mana_cost: d.mana_cost,
  type: d.type_line,
  set: d.set_name,
  rarity: d.rarity
}));

// Write as JSON to standard output:
process.stdout.write(JSON.stringify(magicCardsData));
```

Access the output of the data loader (here, `magic.json`) using [`FileAttachment`](../javascript/files):

```js echo
const magicCards = FileAttachment("magic.json").json();
```

`magic.json` [routes](../loaders#routing) to the `us-electricity.tsv.js` data loader and reads its standard output stream.

```js echo
magicCards
```
