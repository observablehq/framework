import {githubList} from "./github.js";

async function load(repo) {
  process.stdout.write("[");
  let first = true;
  for await (const item of githubList(`/repos/${repo}/issues?state=all`)) {
    if (first) first = false;
    else process.stdout.write(",");
    process.stdout.write(
      `\n  ${JSON.stringify({
        state: item.state,
        pull_request: !!item.pull_request,
        created_at: item.created_at,
        closed_at: item.closed_at,
        draft: item.draft,
        reactions: {...item.reactions, url: undefined},
        title: item.title,
        number: item.number
      })}`
    );
  }
  process.stdout.write("\n]\n");
}

await load("observablehq/plot");
