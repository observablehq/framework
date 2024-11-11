import {githubList} from "./github.js";

async function load(repo: string) {
  const issues: any[] = [];
  for await (const item of githubList(`/repos/${repo}/issues?state=all`)) {
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
  return issues;
}

process.stdout.write(JSON.stringify(await load("observablehq/plot")));
