# Contributing

If you’d like to contribute to the Observable CLI, here’s what you need to do. Clone the [git repo](https://github.com/observablehq/cli), and then run [Yarn (1.x)](https://classic.yarnpkg.com/lang/en/docs/install/) to install dependencies:

```
git clone git@github.com:observablehq/cli.git
cd cli
yarn
```

Next start the local preview server like so:

```
yarn dev
```

If that succeeds, visit <http://127.0.0.1:3000> and you should see something like this:

<figure>
  ${await FileAttachment("localhost.webp").image()}
  <figcaption>The local dev server runs on 127.0.0.1:3000.</figcaption>
</figure>

The local preview server restarts automatically if you edit any of the TypeScript files. The page that you’ll see by default is [docs/index.md](https://github.com/observablehq/cli/blob/main/docs/index.md?plain=1); if you edit that page, you should see it automatically update in the live preview.

To generate the static site:

```
yarn build
```

This creates the `dist` folder. View the site using your preferred web server, such as:

```
http-server dist
```

This documentation site is built on GitHub using the Observable CLI. Please open a pull request if you’d like to contribute to the documentation or to CLI features. Contributors are expected to follow our [code of conduct](https://github.com/observablehq/.github/blob/master/CODE_OF_CONDUCT.md). 🙏
