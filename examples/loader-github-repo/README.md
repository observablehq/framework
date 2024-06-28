[Framework examples →](../)

# GitHub data loader

This [Observable Framework](https://observablehq.com/framework) builds a complete dashboard about a GitHub repo.

Our live demo shows contributors, issues, comments, commits, files… for the [facebook/react](https://github.com/facebook/react) repo.

View live: <https://observablehq.observablehq.cloud/framework-example-loader-github-react/>

## Configuration

_To configure this project, please edit the following information in the .env file_

Your GitHub access token:

<kbd>GITHUB_TOKEN="ght_xxxxx"</kbd>

This personal access token identifies you as a user, and allows the data loaders to make many requests on your behalf on GitHub’s API.

The data loaders collect information on the repo you specify as:

<kbd>GITHUB_REPO="facebook/react"</kbd>

If that repo is private, make sure to grant access to it when you define your token.

The package’s name — used to query the NPM downloads information — is inferred from the `name` field of the `package.json` file. When this turns out incorrect, you can specify it explicitly:

<kbd>NPM_PACKAGE="react"</kbd>

<div class="tip">

TIP: This information is stored in the <code>.env</code> file at the root of the project. It is used by data loaders to request information from GitHub. It is _not_ shared anywhere else on the Internet. The built project is safe to deploy and share publicly.

</div>

## APIs used

This example demonstrates the use of four distinct APIs to access the data:

- GitHub’s [GraphQL API](https://docs.github.com/en/graphql) for general information about the project;
- GitHub’s [REST API](https://docs.github.com/en/rest) for issues;
- The `git` command to download the repos and analyze the commits;
- NPM’s [registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md) to obtain a detailed timeline of the download counts.

While this runs quickly on medium sized projects, we also tested it on large repositories containing hundreds of thousands of commits. For example, it might take about 45 minutes to download and analyze more than a million commits by running `git clone git@github.com:torvalds/linux.git`.
