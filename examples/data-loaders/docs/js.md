# JavaScript data loader examples

Observable Framework supports [data loaders](../loaders) written in JavaScript. These data loaders run in the most standard way—using `node --no-warnings=ExperimentalWarning {script-name}` for JavaScript (.js) data loaders, and `tsx {script-name}` for TypeScript (.ts) data loaders. To test a data loader, you can run the relevant command directly in a shell.

Because data loaders run in this standard environment, they have to be written as standard node (or tsx) scripts. For instance, they have to import explicitly every library that they use.

## TSV

The data loader below accesses data on US hourly electricity demand and generation from the [Energy Information Administration](https://www.eia.gov/opendata/), does some basic wrangling, and returns a tab-separated value file.

Create a file in your project source root with the .tsv.js double extension (for example, `docs/data/my-data.tsv.js`), then paste the JavaScript code below to get started.

```js
showCode(FileAttachment("data/us-electricity.tsv.js"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const usElectricity = FileAttachment("data/us-electricity.tsv").tsv();
```

<p class="tip">The file attachment name does not include the <tt>.js</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now display the attached dataset:

```js echo
Inputs.table(usElectricity)
```

## JSON

The data loader below accesses Magic the Gathering card data from the [Scryfall API](https://scryfall.com/docs/api), does some basic wrangling, and returns a JSON.

Create a file in your project source root with the .json.js double extension (for example, `docs/data/my-data.json.js`), then paste the JavaScript code below to get started.

```js
showCode(FileAttachment("data/magic.json.js"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const magicCards = FileAttachment("data/magic.json").json();
```

<p class="tip">The file attachment name does not include the <tt>.js</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now display the attached dataset:

```js echo
Inputs.table(magicCards)
```

```js
import {showCode} from "./components/showCode.js";
```
