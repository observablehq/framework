import {githubList} from "./github.js";
import {getRepo} from "./github-repo.js";

const repo = await getRepo();

const issues: any[] = [];

process.stdout.write("[\n");
const {nameWithOwner} = repo;
process.stderr.write(`\n${nameWithOwner}`);
process.stderr.write("loading issues");

let i = 0;
for await (const issue of githubList(`/repos/${nameWithOwner}/issues?state=all`, {
  reverse: true
})) {
  process.stderr.write(i % 100 ? "+" : `${i}`);
  if (i++) process.stdout.write("\n,");

  process.stdout.write(
    JSON.stringify({
      id: issue.id,
      title: issue.title,
      user: issue.user?.login,
      state: issue.state,
      created_at: issue.created_at,
      closed_at: issue.closed_at,
      updated_at: issue.updated_at,
      comments: issue.comments,
      reactions: issue.reactions.total_count,
      pull_request: issue.pull_request,
      url: issue.html_url
    })
  );
}

process.stderr.write("\n");
process.stdout.write("\n]\n");
