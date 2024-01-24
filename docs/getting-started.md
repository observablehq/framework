# Getting started

Welcome! This tutorial will guide your first steps with the Observable CLI. If you follow this tutorial to the end, you’ll have a live dashboard ready to share. 🚀

Before we begin, let’s review the development workflow, end-to-end. There are quite a few pieces to take in: the Observable CLI is a local development server, a static site generator, and a command-line interface to Observable, all rolled into one!

```js
const digraph = dot`digraph {
  rankdir=LR

  install -> edit -> preview -> build -> deploy -> view
  preview -> edit
  install
  view

  subgraph cluster_develop {
    label = "develop"
    color = "gray"
    edit
    preview
  }

  subgraph cluster_publish {
    label = "publish"
    color = "gray"
    build
    deploy
  }
}`;
```

<figure>
  ${digraph}
  <figcaption>An overview of the Observable CLI development workflow.</figcaption>
</figure>

Your first step will be to setup your local development environment and [**install**](#1.-install) the Observable CLI. You’ll typically install the CLI within your project, though you can also install it globally if you prefer.

Next you’ll [**develop**](#2.-develop)! This is an iterative process where you save changes to Markdown pages and other source files in your preferred text editor, and then immediately observe the result in a localhost preview running in your browser. The preview server watches project files and streams updates to the browser, re-running code (even data loaders and file attachments!) automatically.

When you’re ready to share your project with your team (or the world), it’s time to [**publish**](#3.-publish). You can either build a static site for self-hosting or hosting on a third-party such as GitHub or Netlify, or you can deploy directly to Observable.

Lastly, share a link to your published project to invite people to [**view**](#4.-view) it!

## 1. Install

The Observable CLI is a Node.js application<!-- and is published to npm as [`@observablehq/cli`](https://www.npmjs.com/package/@observablehq/cli)-->. As the name suggests, the CLI lives on the command line; the instructions below are intended to run in your [terminal](https://support.apple.com/guide/terminal/open-or-quit-terminal-apd5265185d-f365-44cb-8b09-71a064a42125/mac). You’ll need to install [Node.js 20.6 or later](https://nodejs.org/) before you can install the CLI.

We recommend starting with our default project template <!-- https://github.com/observablehq/create --> which currently requires <!-- either npm or --> Yarn 1.x. If you already have Yarn installed, you can check the version like so:

```sh
yarn --version
```

Otherwise, or if some other version of Yarn is installed, you can install Yarn via npm:

```sh
npm install --global yarn
```

See the [Yarn 1.x installation instructions](https://classic.yarnpkg.com/docs/install) for details.

Once Yarn is installed, you can install `observablehq-create`, our project template. This package won’t be made publicly available until the Observable CLI is released, so the command below uses an access token to download it from our private repo. Please do not share this token with anyone outside the Early Access program.

```sh
yarn global add https://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@github.com/observablehq/create
```

Once installed, create a new project with the following command:

```sh
observablehq-create
```

If Yarn doesn’t install onto your `$PATH`, instead try:

```sh
$(yarn global bin)/observablehq-create
```

After answering a few questions, this command will create a new project folder in the current working directory.

## 2. Develop

After you’ve initialized your project, you can start developing locally. In preview mode, the Observable CLI generates HTML pages on-demand as you view a local version of your site in the browser. As you edit files, changes will be instantly reflected in the browser.

To start the preview server:

```sh
yarn dev
```

Then visit <http://127.0.0.1:3000> to preview.

By default, the preview server is only visible to you on your local machine using the loopback address `127.0.0.1`. You can open access to remote connections using <nobr>`--host 0.0.0.0`</nobr>. The preview server runs on port 3000 by default (or the next available port if the former is already in use); you can specify the port with the <nobr>`--port`</nobr> flag.

## 3. Publish

When you’re ready to deploy your project, use the `build` command to generate the output root (`dist`). You can then copy the `dist` folder to your static site server.

To generate your static site:

```sh
yarn build
```

You can then use `npx http-server dist` to preview your built site.

If you’d like to host your project on the [Observable platform](https://observablehq.com) and share it securely with your team, use the `deploy` command.

To deploy your project to Observable:

```sh
yarn deploy
```

Once done, the command will print the URL where you can view your project on the Observable Cloud. It will follow this pattern:

```
https://observablehq.com/@<workspace>/<project-slug>
```

## 4. View

Invite users, share a link…

## Next steps

Here are a few more tips.

### Deploying via GitHub Actions

You can schedule the Observable CLI to build and deploy your project automatically on commit, or on a schedule. We’ll share example source code soon, but please reach out and ask if you have questions on how to setup continuous deployment.

### Installing into an existing project

You can install the CLI as a dependency on an existing project if you don’t want to create a new project using our default template as described above.

```sh
npm install https://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@github.com/observablehq/cli
```

```sh
yarn add https://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@github.com/observablehq/cli
```

You can also install the CLI globally so that the `observable` command is available across projects, but we don’t recommend this approach. By installing the CLI into each project, everyone you work with will use the same version of the CLI.
