[Framework examples →](../)

# Observable Plot downloads

View live: <https://observablehq.observablehq.cloud/framework-example-plot/>

This is an example Observable Framework project that tracks several metrics about the development and usage of [Observable Plot](https://observablehq.com/plot/). It contains a single page in [`src/index.md`](./src/index.md?plain=1), with no configuration file.

## Data loaders

Various datasets are loaded from GitHub’s and npm’s APIs.

### GitHub

Stargazers, issues, and pull-requests, are retrieved from GitHub’s APIs, using a helper [`github.ts`](./src/data/github.ts) to connect to GitHub and do authentication and pagination. Issues and pull-requests are saved as a JSON file, and stargazers as a CSV file. You could use GitHub’s [octokit.js SDK](https://github.com/octokit/octokit.js) for this instead if desired.

During development you might want to use a [GitHub token](https://docs.github.com/rest/using-the-rest-api/getting-started-with-the-rest-api#authentication) to avoid hitting GitHub’s rate limits. To do so, create a `.env` file at the root of the project, and add the token on a single line:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxx
```

### NPM

NPM’s API returns information about the published versions (releases) of the `@observablehq/plot` module, and the number of downloads per day since it was first published.

The [`version-data.csv.ts`](./src/data/version-data.csv.ts) loader calls two API endpoints — one that has the versions with their publication dates, the other their numbers of downloads over the last 7 days — and combines them into a single csv file.

The [`npm-downloads.csv.ts`](./src/data/npm-downloads.csv.ts) loader retrieves the daily number of downloads (of any version). The dataset is trimmed on both ends (since NPM’s API sometimes returns zeroes), and saved as a csv file.

## Big numbers

Key performance indicators are displayed as “big numbers” with, in some cases, a trend indicating growth over one week. Their layout is using the convenience CSS classes _big_, _red_ _etc._

## Charts

The charts are drawn — quite obviously ☺️ — with Observable Plot. The code for the downloads chart is isolated in the [`components/dailyPlot.js`](./src/components/dailyPlot.js) file. The code for the burndown chart is adapted from Tom MacWright’s [GitHub Burndown chart](https://observablehq.com/@tmcw/github-burndown).

The size of the charts automatically adapts to their container’s dimensions with the built-in `resize` helper — part of a collection of helpers currently under development.
