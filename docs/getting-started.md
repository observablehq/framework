# Getting started

The Observable CLI is a Node.js application and is published to npm as [`@observablehq/cli`](https://www.npmjs.com/package/@observablehq/cli). As the name suggests, the CLI lives on the command line; the instructions below are intended to run in your [terminal](https://support.apple.com/guide/terminal/open-or-quit-terminal-apd5265185d-f365-44cb-8b09-71a064a42125/mac). You’ll need to install [Node.js 18 or later](https://nodejs.org/) before you can install the CLI.

## Installing

We recommend starting with a project template.

```sh
npm create @observablehq
```

**Caveat:** this doesn’t work yet because we haven’t created a `@observablehq/create` package on npm.

After answering a few questions, this will create a new project folder containing several files like so:

```
└─ example-project
   ├─ docs
   │  ├─ .observablehq
   │  │  ├─ cache
   │  │  └─ config.ts
   │  ├─ components
   │  │  └─ dotmap.js
   │  ├─ data
   │  │  └─ earthquakes.csv.ts
   │  └─ index.md
   ├─ .gitignore
   ├─ README.md
   ├─ package-lock.json
   └─ package.json
```

How are projects typically structured?

#### `docs`

This is your “source root” — where all your source files live. (This doesn’t have to be named `docs`, but that’s the default; you can change it using the `--root` argument.) Pages go here. Each page is a Markdown file. The Observable CLI uses file-based routing, which means that the name of the file controls where the page is served. You can create as many pages as you like. Use folders to organize your pages.

#### `docs/.observablehq/cache`

This is where you data loader cache will live. You don’t typically have to worry about this, but you can `rm -rf docs/.observablehq/cache` if you want to clean the cache to force data loaders to re-run.

#### `docs/.observablehq/config.ts`

This is where you configure project-level settings, such as the pages and sections in the sidebar navigation, and the project’s title. The config file can be written in either TypeScript (`.ts`) or JavaScript (`.js`). See [below](#configuration) for details.

#### `docs/components`

Put shared [JavaScript modules](./javascript/imports) here. This helps you pull code out of Markdown files and into JavaScript, making it easier to reuse code across pages, write tests and run linters, and even share code with vanilla web applications.

#### `docs/data`

Put [data loaders](./loaders) here.

#### `docs/index.md`

This is the home page for your site. You can have as many additional pages as you’d like, but you should always have a home page, too.

### Installing into an existing project

You can also install the CLI as a dependency on an existing project if you don’t want to create a new project from a template as above. You can even install the CLI globally so that the `observable` command is available across projects.

```sh
npm install @observablehq/cli
```

```sh
yarn add @observablehq/cli
```

**Caveat:** this requires you to add the GitHub Package Registry to your `.npmrc` because we haven’t yet published the `@observablehq/cli` package publicly to npm.

## Preview

```sh
observable preview
```

Visit <http://localhost:3000>.

## Build

```sh
observable build
```

Creates `dist`.

You can use `npx http-server dist` to preview your built site.

## Configuration

A `config.js` (or `config.ts`) file residing under the `docs/.observablehq/` directory allows you to configure certain aspects of the project. The following optional configuration options are supported:

- **title** - the project’s title
- **pages** - the website hierarchy
- **toc** - configuration for the table of contents

If a **title** is specified, it is used as text to describe the link to the home page in the sidebar (for a multipage project), and to complement the titles of the webpages. For instance, a page titled _“Sales”_ in a project titled _“ACME, Inc.”_ will display _“Sales | ACME, Inc.”_ in the browser’s title bar.

The **pages** option is an array containing pages—described by a name and a path starting from the root— and sections—described by a name and a similar array of pages—, creating a website hierarchy. It defaults to the list of markdown files found in the project’s docs, in alphanumerical order, followed by pages found in subdirectories.

The **toc** option is an object describing the generation of the table of contents on each page. It supports the following options:

- **show** - a boolean which defaults to false
- **label** - the table of contents’s header

Both these options can also be set in the page’s front-matter, which takes precedence on the global setting. If **show** is true, and the page contains H2 headings (created for example with a line containing `## Section name`), a table of contents is generated from all the headings, and displayed on the right-hand side of the page.
