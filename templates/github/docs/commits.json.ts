import { MAX_COMMITS } from "./config.js";
import { githubList } from "./github.js";
import { getRepos } from "./github-repos.js";

const { repos } = await getRepos();

const commits: {
  repo: string;
  title: string;
  author_name: string;
  created_at: string;
}[] = [];

for (const { nameWithOwner: repo } of repos) {
  console.warn(`\n${repo}`);
  console.warn("loading commits");

  let i = 0;
  for await (const commit of githubList(`/repos/${repo}/commits`)) {
    process.stderr.write(".");
    commits.unshift({
      repo,
      title: commit.commit.message,
      author_name: commit.commit.author.name,
      created_at: commit.commit.author.date,
    });

    if (++i > MAX_COMMITS) break;
  }
}

process.stdout.write("\n");

console.log(JSON.stringify({ repos, commits }));
