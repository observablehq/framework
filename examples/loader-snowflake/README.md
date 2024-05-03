# Snowflake data loader

This [Observable Framework](https://observablehq.com/framework/) [example](https://github.com/observablehq/framework/tree/main/examples) demonstrates how to write a [data loader](https://observablehq.com/framework/loaders) for Snowflake using the [Snowflake Node.js driver](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver).

To run this example against your Snowflake instance, first create a `.env` file in the project root. Paste the following contents into the `.env` file, replacing the placeholders (`…`) between the quotes with your Snowflake credentials. (This file is ignored by the `.gitignore` file and should not be checked-in to git.)

```sh run=false
SNOWFLAKE_ACCOUNT="…"
SNOWFLAKE_DATABASE="…"
SNOWFLAKE_ROLE="…"
SNOWFLAKE_SCHEMA="…"
SNOWFLAKE_USERNAME="…"
SNOWFLAKE_WAREHOUSE="…"
SNOWFLAKE_PASSWORD="…"
```

Next, edit the example data loader to match your Snowflake schema. The data loader lives in [`src/data/api-requests.csv.ts`](./src/data/api-requests.csv.ts). It written in TypeScript, runs a Snowflake query, and outputs CSV. You can also copy this to a new file and modify it, if you prefer.

Lastly, run the following command to start the preview server:

```sh run=false
npm run dev
```

Then visit <http://localhost:3000> to preview your project.

For more, see <https://observablehq.com/framework/getting-started>.

## Project structure

A typical Framework project looks like this:

```ini
.
├─ src
│  ├─ components
│  │  └─ timeline.js           # an importable module
│  ├─ data
│  │  ├─ launches.csv.js       # a data loader
│  │  └─ events.json           # a static data file
│  ├─ example-dashboard.md     # a page
│  ├─ example-report.md        # another page
│  └─ index.md                 # the home page
├─ .gitignore
├─ observablehq.config.js      # the project config file
├─ package.json
└─ README.md
```

**`src`** - This is the “source root” — where your source files live. Pages go here. Each page is a Markdown file. Observable Framework uses [file-based routing](https://observablehq.com/framework/routing), which means that the name of the file controls where the page is served. You can create as many pages as you like. Use folders to organize your pages.

**`src/index.md`** - This is the home page for your site. You can have as many additional pages as you’d like, but you should always have a home page, too.

**`src/data`** - You can put [data loaders](https://observablehq.com/framework/loaders) or static data files anywhere in your source root, but we recommend putting them here.

**`src/components`** - You can put shared [JavaScript modules](https://observablehq.com/framework/javascript/imports) anywhere in your source root, but we recommend putting them here. This helps you pull code out of Markdown files and into JavaScript modules, making it easier to reuse code across pages, write tests and run linters, and even share code with vanilla web applications.

**`observablehq.config.js`** - This is the [project configuration](https://observablehq.com/framework/config) file, such as the pages and sections in the sidebar navigation, and the project’s title.

## Command reference

| Command           | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `npm install`            | Install or reinstall dependencies                        |
| `npm run dev`        | Start local preview server                               |
| `npm run build`      | Build your static site, generating `./dist`              |
| `npm run deploy`     | Deploy your project to Observable                        |
| `npm run clean`      | Clear the local data loader cache                        |
| `npm run observable` | Run commands like `observable help`                      |
