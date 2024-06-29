import { MAX_ISSUES } from "./config.js";
import { githubList } from "./github.js";
import { getRepos } from "./github-repos.js";

const { repos } = await getRepos();

const issues: any[] = [];

for (const { nameWithOwner: repo } of repos) {
  console.warn(`\n${repo}`);
  console.warn("loading issues");

  let i = 0;
  for await (const issue of githubList(`/repos/${repo}/issues?state=all`)) {
    if (i++ >= MAX_ISSUES) break;
    process.stderr.write(".");
    issues.unshift({
      id: issue.id,
      repo,
      title: issue.title,
      user: issue.user?.login,
      state: issue.state,
      created_at: issue.created_at,
      closed_at: issue.closed_at,
      updated_at: issue.updated_at,
      comments: issue.comments,
      reactions: issue.reactions.total_count,
      url: issue.html_url,
    });
  }
}

process.stderr.write("\n");

console.log(JSON.stringify({ repos, issues }));
