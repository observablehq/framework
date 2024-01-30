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

Welcome! This tutorial will guide your first steps with Observable Framework. (We call it “Framework” for short.) Framework is a new way of building data apps that combines the power of JavaScript for interactive graphics on the front-end with any language you want on the back-end for data preparation and analysis.

In this tutorial, you’ll create a live dashboard of your local weather. 🌦️ But before we begin, let’s first review the end-to-end development workflow. Framework is three things in one:

- a **local development server** that you use to preview your project locally during development, with instant updates as you save changes,
- a **static site generator** that compiles your Markdown, JavaScript, and other sources and static assets — alongside data snapshots generated dynamically by loaders — into a static site that you can host anywhere, and
- a **command-line interface** to Observable so that you can quickly and securely share your site with your team (or the world, or whoever).

We’ll touch on each of these parts in this tutorial.

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

You’ll first setup your local development environment by [**creating**](#2.-create) a new project.

Next you’ll [**develop**](#3.-develop). This is an iterative process where you save changes to source files in your editor, and then preview the result running locally in your browser.

When you’re ready to share your work, it’s time to [**publish**](#4.-publish). You can either build a static site for self-hosting or you can deploy directly to Observable.

Lastly, you can invite people to [**view**](#5.-view) your project!

Of course, you can continue to develop your project after you publish, and then republish to make these changes live. And you can setup continuous deployment so that your site re-builds whenever you push a commit or on a fixed schedule. We’ll cover these [next steps](#next-steps) briefly below.

Here we go… 🚀

## 1. Create

Observable Framework includes a helper script, `observable create`, for creating new projects. After a few quick prompts — where to create the project, your preferred package manager, *etc.* — it will create a fresh project from a template.

<div class="tip">Observable Framework is a <a href="https://nodejs.org/">Node.js</a> application. You must have <a href="https://nodejs.org/en/download">Node.js 20.6 or later</a> installed before you can install Framework. Observable Framework is a command-line interface (CLI) and runs in the terminal.</div>

To create a new project with `npm`, run:

```sh
npm init @observablehq
```

Or to create a new project with `yarn`, run:

```sh
yarn create @observablehq
```

You can run the above command anywhere, but maybe `cd` to your `~/Development` directory first (or wherever you do local development).

First you’ll need to specify where to create the new project. For this tutorial, we want to create a folder called `local-weather` within the current directory, so enter `./local-weather` at the prompt. (This path is equivalent to `local-weather`; we’re just showing that you can use `../` or `/` or `~/` to create a project anywhere.)

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="focus">◆</span>  Where to create your project?
<span class="focus">│</span>  ./local-weather<span class="invert">&nbsp;</span>
<span class="focus">└</span></pre>

Next you’ll need to enter a project title. The title appears in the sidebar as well as on pages. (A memorable name will make your project easier to find in your browser history, for one.) You can just hit Enter here to accept the default title derived from the directory you entered in the previous step.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./local-weather</span>
<span class="muted">│</span>
<span class="focus">◆</span>  What to title your project?
<span class="focus">│</span>  <span class="muted"><span class="invert">L</span>ocal Weather</span>
<span class="focus">└</span></pre>

Next, you can decide whether to include sample files in your new project. These sample files will demonstrate a few tricks, and are handy for learning by tinkering, since you can just edit the code and see what happens. But if you’d prefer a more minimal starter project, you can chose to omit them. We recommend you include them (again, learning), but they’re not needed for this tutorial.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./local-weather</span>
<span class="muted">│</span>
<span class="green">◇</span>  What to title your project?
<span class="muted">│</span>  <span class="muted">Local Weather</span>
<span class="muted">│</span>
<span class="focus">◆</span>  Include sample files to help you get started?
<span class="focus">│</span>  <span class="green">●</span> Yes, include sample files <span class="muted">(recommended)</span>
<span class="focus">│</span>  <span class="muted">○ No, create an empty project</span>
<span class="focus">└</span></pre>

If you use `npm` or `yarn` as your preferred package manager, you should now declare your allegiance. If you’re not sure, chose `npm`. If you prefer a different package manager (say `pnpm`), choose `No`, and then you can install dependencies yourself after the project is created.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./local-weather</span>
<span class="muted">│</span>
<span class="green">◇</span>  What to title your project?
<span class="muted">│</span>  <span class="muted">Local Weather</span>
<span class="muted">│</span>
<span class="green">◇</span>  Include sample files to help you get started?
<span class="muted">│</span>  <span class="muted">Yes, include sample files</span>
<span class="muted">│</span>
<span class="focus">◆</span>  Install dependencies?
<span class="focus">│</span>  <span class="muted">○ Yes, via npm</span>
<span class="focus">│</span>  <span class="green">●</span> Yes, via yarn <span class="muted">(recommended)</span>
<span class="focus">│</span>  <span class="muted">○ No</span>
<span class="focus">└</span></pre>

If you’re going to develop this dashboard further, you’ll likely want source control to track changes and collaborate. Answer `Yes` to initialize a git repository for your no project. This is optional, and you can always do it later by running `git init`.

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./local-weather</span>
<span class="muted">│</span>
<span class="green">◇</span>  What to title your project?
<span class="muted">│</span>  <span class="muted">Local Weather</span>
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

And that’s it! After copying some files and installing some dependencies, your new project will be ready to go! 🎉

<pre><span class="muted">┌</span>  <span class="invert"> observable create </span>
<span class="muted">│</span>
<span class="green">◇</span>  Where to create your project?
<span class="muted">│</span>  <span class="muted">./local-weather</span>
<span class="muted">│</span>
<span class="green">◇</span>  What to title your project?
<span class="muted">│</span>  <span class="muted">Local Weather</span>
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
<span class="green">◇</span>  Installed! 🎉
<span class="muted">│</span>
<span class="green">◇</span>  Next steps…
<span class="muted">│</span>
<span class="muted">│</span>  <span class="focus">cd ./local-weather</span>
<span class="muted">│</span>  <span class="focus">yarn dev</span>
<span class="muted">│</span>
<span class="muted">└</span>  Problems? <u>https://cli.observablehq.com/getting-started</u></pre>

<div class="tip">If you have any issues creating a new project, please visit the <a href="https://talk.observablehq.com">Observable Forum</a> or our <a href="https://github.com/observablehq/cli/discussions">GitHub discussions</a> to ask for help.</div>

## 3. Develop

If you haven’t already, `cd` into your new project folder.

```sh
cd local-weather
```

In preview mode, Framework generates HTML pages on-demand as you view a local version of your site in the browser. As you edit files, changes will be instantly reflected in the browser.

To start the preview server using `npm`:

```sh
npm run dev
```

Or to start the preview server using `yarn`:

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
npm install @observablehq/cli
```

```sh
yarn add @observablehq/cli
```

You can also install Framework globally so that the `observable` command is available across projects, but we don’t recommend this approach. By installing Framework into each project, everyone you work with will use the same version.
