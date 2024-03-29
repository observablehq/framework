# Deploying

You can host your built Framework project on any static site hosting service, or self-host it with any static site server. This guide covers deploying to [Observable](https://observablehq.com), which is the easiest way to host your Framework project as support is built-in. We’ll also cover setting up automated deploys with GitHub Actions.

<div class="tip">

If you don’t already have a project ready to deploy, create one by following our [Getting started guide](./getting-started).

</div>

## Manual deploys

First, make sure that your project builds without error:

```sh
npm run build
```

Once that is done you can deploy to Observable:

```sh
npm run deploy
```

The first time you deploy a project, you will be prompted to configure the project’s _slug_ (which determines its URL), access level, and other details. If you don’t yet have an Observable account or aren’t signed-in, you will also be prompted to sign-up or sign-in.

When the deploy command finishes, it prints a link to observablehq.cloud where you can view your deployed project. If you choose *private* as the access level, that link will only be accessible to members of your Observable workspace. (You can invite people to your workspace by going to observablehq.com.) If you chose *public*, you can share your project link with anyone. You can change the access level of a project later [from your workspace projects page](https://observablehq.com/select-workspace?next=projects).

<div class="note">The deploy command creates a file at <code>docs/.observablehq/deploy.json</code> with information on where to deploy the project. This file is required for automated deploys. You will need to commit this file to git to deploy via GitHub Actions. (If you have configured a source root besides <code>docs</code>, the file will be placed there instead.)</div>

<div class="tip">To see more available options when deploying:<pre><code class="language-sh">npm run deploy -- --help</code></pre></div>

## Automated deploys

To set up automatic deploys (also known as *continuous deployment* or *CD*), we recommend [GitHub Actions](https://github.com/features/actions). In your git repository, create and commit a file at `.github/workflows/deploy.yml`. Here is a starting example:

```yaml
name: Deploy

on:
  # Run this workflow whenever a new commit is pushed to main.
  push: {branches: [main]}
  # Run this workflow once per day, at 10:15 UTC
  schedule: [{cron: "15 10 * * *"}]
  # Run this workflow when triggered manually in GitHub’s UI.
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

When deploying automatically, you can’t sign-in in your browser the way you did for manual deploys; instead, your GitHub action will authenticate using an Observable API key (also known as a *token* and referred to as `OBSERVABLE_TOKEN` above).

To create an API key:

1. Open the [API Key settings](https://observablehq.com/select-workspace?next=api-keys-settings) for your Observable workspace.
2. Click **New API Key**.
3. Check the **Deploy new versions of projects** checkbox.
4. Give your key a description, such as “Deploy via GitHub Actions”.
5. Click **Create API Key**.

<div class="caution">

The token you create is the equivalent of a password giving write access to your hosted project. **Do not commit it to git** or share it with anyone you don’t trust. If you accidentally expose your key, you can go back to your settings to immediately revoke it (and create a new key).

</div>

In a moment, you’ll copy-paste your new Observable API key, so leave this window open for now. (If you accidentally close the window, you can delete the old key and create a new one. For security, API keys are only shown once upon creation.)

To authenticate with Observable and to access the Observable API key securely from our Github action, we’ll use a [GitHub secret](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

To create a GitHub secret, in a new window:

1. Go to your GitHub repository.
2. In the top navigation, click **Settings**.
3. In the left sidebar, click **Secrets and variables**, then **Actions**.
4. Click **New repository secret**.
5. In the **Name** field, enter `OBSERVABLE_TOKEN`.
6. In the **Secret** field, paste the API key you created on Observable.
7. Click **Add secret**.

After you’ve performed these steps, the `deploy.yml` above will automatically build and deploy your project once per day (to keep your data up-to-date), as well as whenever you push a new version of the code to your repository (so you can make changes at any time).

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

This uses one cache per calendar day (in the `America/Los_Angeles` time zone). If you deploy multiple times in a day, the results of your data loaders will be reused on the second and subsequent runs. You can customize the `date` and `cache-data` steps to change the cadence of the caching. For example you could use `date +'%Y-%U'` to cache data for a week or `date +'%Y-%m-%dT%H` to cache it for only an hour.

<div class="note">You’ll need to edit the paths above if you’ve configured a source root other than <code>docs</code>.</div>

## Other hosting services

Observable Framework builds a set of static files that can be hosted by any static site hosting services. To build your project, run:

```sh
npm run build
```

Then upload the contents of your `dist` directory to your static service of choice.

<div class="tip">By default, Framework generates “clean” URLs by dropping the `.html` extension from page links. Not all webhosts support this; some need the <a href="./config#cleanUrls"><b>cleanUrls</b> config option</a> set to false.</div>

<div class="tip">When deploying to GitHub Pages without using GitHub’s related actions (<a href="https://github.com/actions/configure-pages">configure-pages</a>,
<a href="https://github.com/actions/deploy-pages">deploy-pages</a>, and
<a href="https://github.com/actions/upload-pages-artifact">upload-pages-artifact</a>), you may need to create a <code>.nojekyll</code> file in your <code>dist</code> folder after building. See GitHub’s documentation on <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#static-site-generators">static site generators</a> for more.</div>
