# GitHub Stats

This is an [Observable Framework](https://observablehq.com/framework) project. To start the local preview server, run:

```
yarn dev
```

Then visit <http://localhost:3000> to preview your project.

For more, see <https://observablehq.com/framework/getting-started>.

## Configuration

_To run this project, please enter the following information_

Your GitHub access token:

<kbd>GITHUB_TOKEN="gh_xxxxx"</kbd>

This personal access token identifies you as a user, and allows the data loaders to make many requests on your behalf on GitHub’s API.

By default, we collect information on the repos you own or have contributed to. If some of the repos you want to analyze are private, make sure to grant access to them when you define your token.

Instead of looking at your own repos, you might want to indicate an organization name:

<kbd>GITHUB_ORG="observablehq"</kbd>

in that case, the data loaders will retrieve information on repos from that organization.

Alternatively, specify an explicit list of repos to visualize, separated by commas:

<kbd>GITHUB_REPOS="observablehq/framework, mrdoob/three.js"</kbd>

<div class="tip">

TIP: This information is stored in the <code>.env</code> file at the root of the project. It is used by data loaders to request information from GitHub. It is _not_ shared anywhere else on the Internet. If you deploy the build as a public project, visitors will see the list of repos and the information extracted from GitHub, but they will not have access to your PAT.

</div>

## Limits

By default, we set some limits, which you can override in the `.env` file:

- `MAX_REPOS` - number of repos to scan for details; defaults to 10
- `MAX_COMMITS` - number of commits per repo; defaults to 1,000
- `MAX_ISSUES` - number of issues per repo; defaults to 1,000
