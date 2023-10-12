# Contributing

If you’d like to contribute to the Observable CLI, here’s how. First clone the [git repo](https://github.com/observablehq/cli) and run [Yarn (1.x)](https://classic.yarnpkg.com/lang/en/docs/install/) to install dependencies:

```sh
git clone git@github.com:observablehq/cli.git
cd cli
yarn
```

Next start the local preview server:

```sh
yarn dev
```

Lastly visit <http://127.0.0.1:3000>.

The local preview server restarts automatically if you edit any of the TypeScript files, though you may need to reload. The default page is [docs/index.md](https://github.com/observablehq/cli/blob/main/docs/index.md?plain=1); if you edit that file and save changes, the live preview in the browser will automatically update.

To generate the static site:

```sh
yarn build
```

This creates the `dist` folder. View the site using your preferred web server, such as:

```sh
http-server dist
```

If you prefer using https for local development, add the SSL key and certificate files to the ssl folder, then call:

```sh
bin/observable.ts preview --ssl
```

You will then have to accept the self-signed certificate in each of your browsers. To generate the files, you can run:

```sh
yarn cert
```

This documentation site is built on GitHub using the Observable CLI; see the [deploy workflow](https://github.com/observablehq/cli/blob/main/.github/workflows/deploy.yml). Please open a pull request if you’d like to contribute to the documentation or to CLI features. Contributors are expected to follow our [code of conduct](https://github.com/observablehq/.github/blob/master/CODE_OF_CONDUCT.md). 🙏
