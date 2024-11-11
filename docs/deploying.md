# Deploying

You can host your built Framework app on any static site hosting service, or self-host it with any static site server. This guide covers deploying to [Observable Cloud](https://observablehq.com/platform/cloud), which is the easiest way to host your Framework app as support is built-in. We’ll also cover setting up automated deploys with GitHub Actions.

<div class="tip">

If you don’t yet have an app ready to deploy, create one by following our [Getting started guide](./getting-started).

</div>

## Manual deploys

To deploy your app, run the deploy command:

```sh
npm run deploy
```

<div class="tip">

Deploying automatically creates a [deploy configuration file](#deploy-configuration) (`.observablehq/deploy.json`) if it does not already exist. You should commit this file to git; it is required for automated deploys, and lets you re-deploy manually with fewer prompts.

</div>

The first time you deploy an app, you will be prompted to configure the app’s _slug_ (which determines its URL), access level, and other details. If you aren’t yet signed-in to Observable, you will also be prompted to sign-in.

When the deploy command finishes, it prints a link to observablehq.cloud where you can view your deployed app. If you choose _private_ as the access level, that link will only be accessible to members of your Observable workspace. (You can invite people to your workspace by going to observablehq.com.) If you choose _public_, you can share your app link with anyone. You can change the access level of an app later [from your Data apps page](https://observablehq.com/select-workspace?next=projects).

<div class="tip">

To see more available options when deploying:

```sh run=false
npm run deploy -- --help
```

</div>

## Automated deploys

After deploying an app manually at least once, Observable can handle subsequent deploys for you automatically. You can automate deploys both [on commit](https://observablehq.com/documentation/data-apps/github) (whenever you push a new commit to your project’s default branch) and [on schedule](https://observablehq.com/documentation/data-apps/schedules) (such as daily or weekly).

Automatic deploys — also called _continuous deployment_ or _CD_ — ensure that your data is always up to date, and that any changes you make to your app are immediately reflected in the deployed version.

On your app settings page on Observable, open the **Build settings** tab to set up a link to a GitHub repository hosting your project’s files. Observable will then listen for changes in the repo and deploy the app automatically.

The settings page also allows you to trigger a manual deploy on Observable Cloud, add secrets (for data loaders to use private APIs and passwords), view logs, configure sharing, _etc._ For details, see the [Building & deploying](https://observablehq.com/documentation/data-apps/deploys) documentation.

## GitHub Actions

As an alternative to building on Observable Cloud, you can use [GitHub Actions](https://github.com/features/actions) and have GitHub build a new version of your app and deploy it to Observable. In your git repository, create and commit a file at `.github/workflows/deploy.yml`. Here is a starting example:

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

<div class="tip">As shown above, deploy messages can be set using <code>--message</code>. This is especially useful for continuous deployment from a git repository: the message can include the SHA, author, and message of the latest commit.</div>

When deploying automatically, you can’t sign-in in your browser the way you did for manual deploys; instead, your GitHub action will authenticate using an Observable API key (also known as a _token_ and referred to as `OBSERVABLE_TOKEN` above).

To create an API key:

1. Open the [API Key settings](https://observablehq.com/select-workspace?next=api-keys-settings) for your Observable workspace.
2. Click **New API Key**.
3. Check the **Deploy new versions of projects** checkbox. <!-- TODO apps -->
4. Give your key a description, such as “Deploy via GitHub Actions”.
5. Click **Create API Key**.

<div class="caution">

The token you create is the equivalent of a password giving write access to your hosted app. **Do not commit it to git** or share it with anyone you don’t trust. If you accidentally expose your key, you can go back to your settings to immediately revoke it (and create a new key).

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

After you’ve performed these steps, the `deploy.yml` above will automatically build and deploy your app once per day (to keep your data up-to-date), as well as whenever you push a new version of the code to your repository (so you can make changes at any time).

### Caching

If some of your data loaders take a long time to run, or simply don’t need to be updated every time you modify the code, you can set up caching to automatically re-use existing data from previous builds. To do that, add the following steps to your `deploy.yml` before you run `build`:

```yaml
jobs:
  deploy:
    steps:
      # …
      - id: date
        run: echo "date=$(TZ=America/Los_Angeles date +'%Y-%m-%d')" >> $GITHUB_OUTPUT
      - id: cache-data
        uses: actions/cache@v4
        with:
          path: src/.observablehq/cache
          key: data-${{ hashFiles('src/data/*') }}-${{ steps.date.outputs.date }}
      # …
```

This uses one cache per calendar day (in the `America/Los_Angeles` time zone). If you deploy multiple times in a day, the results of your data loaders will be reused on the second and subsequent runs. You can customize the `date` and `cache-data` steps to change the cadence of the caching. For example you could use `date +'%Y-%U'` to cache data for a week or `date +'%Y-%m-%dT%H'` to cache it for only an hour.

<div class="note">You’ll need to edit the paths above if you’ve configured a source root other than <code>src</code>.</div>

## Deploy configuration

The deploy command creates a file at <code>.observablehq/deploy.json</code> under the source root (typically <code>src</code>) with information on where to deploy the app. This file allows you to re-deploy an app without having to repeat where you want the app to live on Observable.

The contents of the deploy config file look like this:

```json run=false
{
  "projectId": "0123456789abcdef",
  "projectSlug": "hello-framework",
  "workspaceLogin": "acme"
}
```

To store the deploy config file somewhere else, use the `--deploy-config` argument. For example, to create a “staging” deploy to share early versions of your app, you could use a `deploy-staging.json` like so:

```sh
npm run deploy -- --deploy-config=src/.observablehq/deploy-staging.json
```

If the specified config file does not yet exist, you will again be prompted to choose or create a new app; the resulting configuration will then be saved to the specified file. You can re-deploy to staging by passing the same `--deploy-config` argument; or you can deploy to “production” by not specifying the `--deploy-config` argument to use the default deploy config.
