# GitHub data loader

Here’s a TypeScript data loader that talks to the GitHub API, fetching a summary of all open issues and pull requests in the Framework repo. (To produce a smaller file, only a subset of fields are included in the output.)

```js run=false
import {githubList} from "./github.js";

const issues = [];

for await (const item of githubList("/repos/observablehq/framework/issues?state=open")) {
  issues.push({
    state: item.state,
    pull_request: !!item.pull_request,
    created_at: item.created_at,
    closed_at: item.closed_at,
    draft: item.draft,
    reactions: {...item.reactions, url: undefined},
    title: item.title,
    number: item.number
  });
}

process.stdout.write(JSON.stringify(issues));
```

<div class="note">

To run this data loader, you’ll need to install `dotenv` using your preferred package manager such as npm or Yarn. You’ll also need the provided `github.js` helper file.

</div>

For the data loader to authenticate with GitHub, you will need to set the secret `GITHUB_TOKEN` environment variable. If you use GitHub Actions, the `GITHUB_TOKEN` is [provided automatically as a secret](https://docs.github.com/en/actions/security-guides/automatic-token-authentication). For local development, we use the `dotenv` package, which allows environment variables to be defined in a `.env` file which lives in the project root and looks like this:

```
GITHUB_TOKEN="github_pat_XXX"
```

<div class="warning">

The `.env` file should not be committed to your source code repository; keep your credentials secret.

</div>

Replace the `XXX` above with your [GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

The above data loader lives in `data/issues.json.js`, so we can load the data as `data/issues.json`. The `FileAttachment.json` method parses the file and returns a promise to an array of objects.

```js echo
const issues = FileAttachment("./data/issues.json").json();
```

You can inspect the data using `display`.

```js echo
display(issues);
```

Alternatively, you can display the data in a table using `Inputs.table`.

```js echo
Inputs.table(
  issues.map((d) => ({
    title: `#${d.number} - ${d.title}`,
    upvotes: d.reactions["+1"]
  })),
  {
    maxWidth: 640,
    sort: "upvotes",
    reverse: true
  }
)
```
