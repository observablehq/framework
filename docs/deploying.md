# Deploying

You can host your built Framework app on any static site hosting service, or self-host it with any static site server. This guide covers automating deploys to [GitHub Pages](https://pages.github.com/) with [GitHub Actions](https://github.com/features/actions), and assumes that you are hosting your Framework project’s git repository on GitHub.

<div class="tip">

If you don’t yet have an app ready to deploy, create one by following our [Getting started guide](./getting-started).

</div>

In your git repository, create the file `.github/workflows/deploy.yml` with the following contents:

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
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Commit this file to your main branch and push to GitHub. Then follow [GitHub’s instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow) to specify GitHub Actions as the source for GitHub Pages.

After you’ve performed these steps, the `deploy.yml` above will automatically build and deploy your app once per day (to keep your data up-to-date), as well as whenever you push new commits to your GitHub repository’s main branch (so you can make changes at any time). You will also be able to manually trigger a deploy through GitHub’s user interface. If you like, you can disable any of these triggers (`push`, `schedule`, or `workflow_dispatch`) by updating the `deploy.yml` file.

### Caching

If some of your data loaders take a long time to run, or simply don’t need to be updated every time you build, you can set up caching to automatically re-use existing data from previous builds. To do that, add the following steps to your `deploy.yml` before `npm run build`:

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

<div class="note">

This will only cache data loaders that live under <code>src/data</code>. You’ll need to edit the paths above if you’ve configured a source root other than <code>src</code>, or if the data loaders you want to cache live elsewhere.

</div>

This uses one cache per calendar day (in the `America/Los_Angeles` time zone). If you deploy multiple times in a day, the results of your data loaders will be reused on the second and subsequent runs. You can customize the `date` and `cache-data` steps to change the cadence of the caching. For example you could use `date +'%Y-%U'` to cache data for a week or `date +'%Y-%m-%dT%H'` to cache it for only an hour.
