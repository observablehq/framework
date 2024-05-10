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
