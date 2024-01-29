<style type="text/css">

.focus {
  color: var(--theme-foreground-focus);
}

.invert {
  background-color: var(--theme-foreground-alt);
  color: var(--theme-background);
}

</style>

# Getting started

Welcome! This tutorial will guide your first steps with Observable Framework. (We’ll refer to it as “Framework” for short.) If you follow this tutorial to the end, you’ll have a live dashboard ready to share. 🚀

Before we begin, let’s review the development workflow, end-to-end. Framework is a **local development server**, a **static site generator**, and a **command-line interface** to Observable, all rolled into one!

```js
const digraph = dot`digraph {
  rankdir=LR

  create -> edit -> preview -> build -> deploy -> view
  preview -> edit

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

<figure style="max-width: 960px;">
  ${digraph}
  <figcaption>An overview of the development workflow.</figcaption>
</figure>

You’ll first [**create**](#2.-create) a new project, setting up your local development environment.

Next you’ll [**develop**](#3.-develop). This is an iterative process where you save changes to Markdown and other source files in your preferred editor, and then preview the result running locally in your browser.

When you’re ready to share with your team (or the world), it’s time to [**publish**](#4.-publish). You can either build a static site for self-hosting or hosting on a third-party such as GitHub or Netlify, or you can deploy directly to Observable.

Lastly, you can invite people to [**view**](#5.-view) your project!

## 1. Create

<div class="tip">Observable Framework is a <a href="https://nodejs.org/">Node.js</a> application. You must have <a href="https://nodejs.org/en/download">Node.js 20.6 or later</a> installed before you can install Framework.</div>

To create a new project, you can use `npm`:

```sh
npm init @observablehq
```

Or if you prefer `yarn`:

```sh
yarn create @observablehq
```

This runs `observable create`, our helper script for creating new projects. You will be asked several questions, starting with where to create the new project.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="focus">◆</span>  Where to create your project?
<span class="focus">│</span>  <span class="muted"><span class="invert">.</span>/demo-project</span>
<span class="focus">└</span></pre>

We’ll use the name `./hello-framework` for our project folder.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./hello-framework</span>
<span class="muted">│</span>
<span class="focus">◆</span>  Include sample files to help you get started?
<span class="focus">│</span>  <span class="green">●</span> Yes, include sample files <span class="muted">(recommended)</span>
<span class="focus">│</span>  <span class="muted">○ No, create an empty project</span>
<span class="focus">└</span></pre>

…

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./hello-framework</span>
<span class="muted">│</span>
<span class="green">◇</span>  Include sample files to help you get started?
<span class="muted">│</span>  <span class="muted">Yes, include sample files</span>
<span class="muted">│</span>
<span class="focus">◆</span>  Install dependencies?
<span class="focus">│</span>  <span class="muted">○ Yes, via npm</span>
<span class="focus">│</span>  <span class="green">●</span> Yes, via yarn <span class="muted">(recommended)</span>
<span class="focus">│</span>  <span class="muted">○ No</span>
<span class="focus">└</span></pre>

If you choose a package manager here, we’ll automatically install dependencies when the project is created. If you want to use something besides `npm` or `yarn`, we’ll leave it to you.

…

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./hello-framework</span>
<span class="muted">│</span>
<span class="green">◇</span>  Include sample files to help you get started?
<span class="muted">│</span>  <span class="muted">Yes, include sample files</span>
<span class="muted">│</span>
<span class="green">◇</span>  Install dependencies?
<span class="muted">│</span>  <span class="muted">Yes, via yarn</span>
<span class="muted">│</span>
<span class="focus">◆</span>  Initialize a git repository?
<span class="focus">│</span>  <span class="green">●</span> Yes <span class="muted">/ ○ No</span>
<span class="focus">└</span></pre>

…

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./hello-framework</span>
<span class="muted">│</span>
<span class="green">◇</span>  Include sample files to help you get started?
<span class="muted">│</span>  <span class="muted">Yes, include sample files</span>
<span class="muted">│</span>
<span class="green">◇</span>  Install dependencies?
<span class="muted">│</span>  <span class="muted">Yes, via yarn</span>
<span class="muted">│</span>
<span class="green">◇</span>  Initialize a git repository?
<span class="muted">│</span>  <span class="muted">Yes</span>
<span class="muted">│</span>
<span class="green">◇</span>  Installed!
<span class="muted">│</span>
<span class="green">◇</span>  Next steps…
<span class="muted">│</span>
<span class="muted">│</span>  <span class="focus">cd ./hello-framework</span>
<span class="muted">│</span>  <span class="focus">yarn dev</span>
<span class="muted">│</span>
<span class="muted">└</span>  Problems? <u>https://framework.observablehq.com/getting-started</u></pre>

After answering a few questions, this command will create a new project folder in the current working directory.

```sh
cd hello-world
```

```sh
yarn
```

## 3. Develop

After you’ve initialized your project, you can start developing locally. In preview mode, Framework generates HTML pages on-demand as you view a local version of your site in the browser. As you edit files, changes will be instantly reflected in the browser.

To start the preview server:

```sh
yarn dev
```

Then visit <http://127.0.0.1:3000> to preview.

By default, the preview server is only visible to you on your local machine using the loopback address `127.0.0.1`. You can open access to remote connections using <nobr>`--host 0.0.0.0`</nobr>. The preview server runs on port 3000 by default (or the next available port if the former is already in use); you can specify the port with the <nobr>`--port`</nobr> flag.

## 4. Publish

When you’re ready to deploy your project, use the `build` command to generate the output root (`dist`). You can then copy the `dist` folder to your static site server.

To generate your static site:

```sh
yarn build
```

You can then use `npx http-server dist` to preview your built site.

If you’d like to host your project on [Observable](https://observablehq.com) and share it securely with your team, use the `deploy` command:

```sh
yarn deploy
```

Once done, the command will print the URL where you can view your project on the Observable Cloud. Something like: https://observablehq.com/@{workspace}/{slug}.

## 5. View

Invite users, share a link…

## Next steps

Here are a few more tips.

### Deploying via GitHub Actions

You can schedule builds and deploy your project automatically on commit, or on a schedule. We’ll share example source code soon, but please reach out and ask if you have questions on how to setup continuous deployment.

### Installing into an existing project

You can install Framework as a dependency on an existing project if you don’t want to create a new project using our default template as described above.

```sh
npm install @observablehq/framework
```

```sh
yarn add @observablehq/framework
```

You can also install Framework globally so that the `observable` command is available across projects, but we don’t recommend this approach. By installing Framework into each project, everyone you work with will use the same version.
