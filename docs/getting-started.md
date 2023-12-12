# Getting started

The Observable CLI is a Node.js application and is published to npm as [`@observablehq/cli`](https://www.npmjs.com/package/@observablehq/cli). As the name suggests, the CLI lives on the command line; the instructions below are intended to run in your [terminal](https://support.apple.com/guide/terminal/open-or-quit-terminal-apd5265185d-f365-44cb-8b09-71a064a42125/mac). You’ll need to install [Node.js 20 or later](https://nodejs.org/) before you can install the CLI.

## Installing

We recommend starting with our [default project template](https://github.com/observablehq/create) using either npm or Yarn:

```sh
npm init @observablehq
```
```sh
yarn create @observablehq
```

After answering a few questions, this will create a new project folder containing several files like so:

```
.
├─ docs
│  ├─ .observablehq
│  │  └─ cache
│  ├─ components
│  │  └─ dotmap.js
│  ├─ data
│  │  └─ quakes.csv.ts
│  └─ index.md
├─ .gitignore
├─ README.md
├─ observablehq.config.ts
├─ package-lock.json
└─ package.json
```

How are projects typically structured?

#### `docs`

This is your “source root” — where your source files live. This doesn’t have to be named `docs`, but that’s the default; you can change it using the **root** [config option](./config). Pages go here. Each page is a Markdown file. The Observable CLI uses [file-based routing](./routing), which means that the name of the file controls where the page is served. You can create as many pages as you like. Use folders to organize your pages.

#### `docs/.observablehq/cache`

This is where you [data loader](./loaders) cache lives. You don’t typically have to worry about this, but you can `rm -rf docs/.observablehq/cache` if you want to clean the cache to force data loaders to re-run.

#### `docs/.observablehq/deploy.json`

If you deploy your project to the Observable platform, we’ll save some information here to make it easier to redeploy your site next time.

#### `docs/components`

You can put shared [JavaScript modules](./javascript/imports) anywhere in your source root, but we recommend putting them here. This helps you pull code out of Markdown files and into JavaScript, making it easier to reuse code across pages, write tests and run linters, and even share code with vanilla web applications.

#### `docs/data`

You can put [data loaders](./loaders) anywhere in your source root, but we recommend putting them here.

#### `docs/index.md`

This is the home page for your site. You can have as many additional pages as you’d like, but you should always have a home page, too.

#### `observablehq.config.ts`

This is your [project configuration](./config) file, such as the pages and sections in the sidebar navigation, and the project’s title. The config file can be written in either TypeScript (`.ts`) or JavaScript (`.js`).
### Installing into an existing project

You can also install the CLI as a dependency on an existing project if you don’t want to create a new project from a template as above.

```sh
npm install @observablehq/cli
```

```sh
yarn add @observablehq/cli
```

You can also install the CLI globally so that the `observable` command is available across projects, but we don’t recommend this approach. By installing the CLI into each project, everyone you work with will use the same version of the CLI.

## Preview

After you’ve initialized your project, use the `preview` command to develop your app. In preview mode, the Observable CLI generates HTML pages on-demand as you preview your site in the browser. As you edit files, changes will be instantly pushed to the browser.

To start the preview server:

```sh
observable preview
```

Then visit <http://localhost:3000> to develop.

By default, the preview server is only visible to you on your local machine using the loopback address `127.0.0.1`. You can open access to remote connections using <nobr>`--host 0.0.0.0`</nobr>. Additionally, the preview server runs on port 3000 by default; you can change the port using the <nobr>`--port`</nobr> flag.

## Build

When you’re ready to deploy your project, use the `build` command to generate the output root (`dist`). You can then copy the `dist` folder to your static site server.

To generate your static site:

```sh
observable build
```

You can then use `npx http-server dist` to preview your built site.

## Deploy

If you’d like to host your project on the [Observable platform](https://observablehq.com) and share it securely with your team, use the `deploy` command.

To deploy your project to Observable:

```sh
observable deploy
```

Then visit <https://observablehq.com> to see your project.
