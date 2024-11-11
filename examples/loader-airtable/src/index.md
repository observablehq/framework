# Airtable data loader

Here’s a TypeScript data loader that reads values from a database hosted on [Airtable](https://airtable.com/).

It uses the [airtable.js](https://github.com/Airtable/airtable.js) development kit. See [the official API documentation](https://airtable.com/developers/web/api/introduction), which allows you to select your database for “live documentation” running on your own data; make sure to select the “JavaScript” tab.

To run this data loader, you’ll need to create a personal access token at [/create/tokens](https://airtable.com/create/tokens) and save its value in the `.env` file at the root of the project. (Mine is scoped to only _read_ values from the _penguins_ database.) In that same `.env` file, you will also specify the database id:

```txt
AIRTABLE_PAT="patXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXX"
AIRTABLE_DB="appWXXXXXXXXX"
```

<div class="note">

To run this data loader, you’ll need to install `airtable` and `dotenv` using your preferred package manager such as npm or Yarn.

</div>

The data loader’s code:

```js run=false
import "dotenv/config";
import Airtable from "airtable";
import {csvFormat} from "d3-dsv";

const {AIRTABLE_PAT, AIRTABLE_DB} = process.env;

Airtable.configure({apiKey: AIRTABLE_PAT});

const base = Airtable.base(AIRTABLE_DB as string);

const data: any[] = [];

base("penguins")
  .select({view: "Grid view"})
  .eachPage(
    (records, fetchNextPage) => {
      records.forEach((record) => data.push(record.fields));
      fetchNextPage();
    },
    (err) => {
      if (err) throw err;
      process.stdout.write(csvFormat(data));
    }
  );
```

It lives in `data/penguins.csv.ts`, so we can load the data using `data/penguins.csv`.

```js
Inputs.table(penguins)
```

```js echo
const penguins = FileAttachment("./data/penguins.csv").csv({typed: true});
```

<div class="tip">

Using the Airtable API you can do more than just read the whole database: it’s also possible to load comments, or make specific queries to get a subset of the values.

</div>
