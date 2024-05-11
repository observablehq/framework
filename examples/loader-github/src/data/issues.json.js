import "dotenv/config";
import {Octokit} from "octokit";

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

const iterator = octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
  owner: "observablehq",
  repo: "framework",
  state: "open",
  per_page: 100
});

const issues = [];

for await (const {data} of iterator) {
  for (const item of data) {
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
}

process.stdout.write(JSON.stringify(issues));
