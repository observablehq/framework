# Deploying

When time comes to share your project, you have many options for deploying it for others to see. Framework is compatible with many static site hosts and automation environments. In this guide we’ll focus on deploying to Observable manually, then with GitHub Actions.

## Manually deploying to Observable

If you don’t already have a project to deploy, you can create one by following [getting-started](./getting-started). First, make sure that your project builds without error:

```sh
$ npm run build
```

Once that is done you can deploy to Observable with the command

```sh
$ npm run deploy
```

The first time you run this command, you will be prompted for details needed to set up the project on the server, such as the project's _slug_ (which determines its URL), and the access level. If you don’t already have an Observable account or aren’t signed in, this command will also guide you through setting that up.

When the deploy command finishes, it prints a link to observablehq.cloud where you can view your deployed project. If you choose “private” as the access level, you can now share that link with anyone who is a member of  your workspace. If you chose “public”, you can share that link with anyone and they’ll be able to see your Framework project.

<div class="note">The deploy command creates a file at <code>docs/.observablehq/deploy.json</code> with information on where to deploy the project. It is required for automated deploys. You should commit it to git to make it available to GitHub Actions. (If you have configured a source root besides <code>docs/</code>, the file will be placed there instead.)</div>

## Automated deploys to Observable

To set up automatic deploys, we’ll be using [GitHub actions](https://github.com/features/actions). In your git repository, create and commit a file at `.github/workflows/deploy.yml`. Here is a starting example:

```yaml
name: Deploy
on:
  # Run this workflow whenever a new commit is pushed to main.
  push: {branches: [main]}
  # Run this workflow once per day, at 10:15 UTC
  schedule: [{cron: "15 10 * * *"}]
  # Run this workflow when triggered manually in GitHub's UI.
  workflow_dispatch: {}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Deploy to Observable Cloud
        # This parameter to `--message` will use the latest commit message
        run: npm run deploy -- --message "$(git log -1 --pretty=%s)"
        env:
          # Authentication information. See below for how to set this up.
          OBSERVABLE_TOKEN: ${{ secrets.OBSERVABLE_TOKEN }}
```

When deploying automatically, you won’t be able to login with a browser the way you did for manual deploys. Instead, you will authenticate via the environment variable `OBSERVABLE_TOKEN`, using an API key from Observable.

To create a token, go to https://observablehq.com and open your workspace settings. Choose “API keys”. From there, create a new key, and assign it the "Deploy new versions of projects" scope.

That token is the equivalent of a password giving write access to your hosted project. **Do not commit it to git** (and, if it is exposed in any way, take a minute to revoke it and create a new one instead—or contact support).

To pass this information securely to the Github action (so it can effectively be authorized to deploy the project to Observable), we’ll use GitHub secrets. Sign in to the settings of your GitHub account, and add a secret named `OBSERVABLE_TOKEN`. See [GitHub’s documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) for more information about secrets.

This `deploy.yml` will automatically build and deploy your project once per day (to keep your data up-to-date), as well as whenever you push a new version of the code to your repository (so you can make changes at any time).

### Caching

If some of your data loaders take a long time to run, or simply don’t need to be updated every time you modify the code, you can set up caching to automatically re-use existing data from previous builds. To do that, add the following steps to your `deploy.yml` before you run `build`:

```yaml
jobs:
  deploy:
    steps:
      # ...
      - id: date
        run: echo "date=$(TZ=America/Los_Angeles date +'%Y-%m-%d')" >> $GITHUB_OUTPUT
      - id: cache-data
        uses: actions/cache@v4
        with:
          path: docs/.observablehq/cache
          key: data-${{ hashFiles('docs/data/*') }}-${{ steps.date.outputs.date }}
      - if: steps.cache-data.outputs.cache-hit == 'true'
        run: find docs/.observablehq/cache -type f -exec touch {} +
      # ...
```

This uses one cache per calendar day (in the “America/Los_Angeles” time zone). If you deploy multiple times in a day, the results of your data loaders will be reused on the second and subsequent runs. You can customize the `date` and `cache-data` steps to change the cadence of the caching. For example you could use `date +'%Y-%U'` to cache data for a week or `date +'%Y-%m-%dT%H` to cache it for only an hour.

<div class="note">You’ll need to change the paths used in this config if <code>observablehq.config.js</code> points to a different <code>root</code>.</div>

## Deploying to other services

The output of Observable Framework is set of static files that can be hosted by many services. To build a hostable copy of your project, run:

```sh
$ npm run build
```

Then you can upload the contents of your `dist/` directory to your static webhost of choice. Some webhosts may need the `cleanUrls` option <a href="https://github.com/observablehq/framework/releases/tag/v1.3.0" target="_blank" class="observablehq-version-badge" data-version="^1.3.0" title="Added in v1.3.0"></a> set to false in your project configuration file. For details and other options, see [configuration](./config).
