import { getRepos } from "./github-repos.js";
import { github } from "./github.js";

const info: any[] = [];
const { repos } = await getRepos();

for (const {
  nameWithOwner: repo,
  defaultBranchRef: { name: branch },
} of repos) {
  console.warn("loading files for", repo, branch);
  try {
    const {
      body: { tree },
    } = await github(`/repos/${repo}/git/trees/${branch}?recursive=1`);
    info.push({
      name: repo,
      tree: tree.map(({ path, size }) => ({ path, size })),
    });
  } catch (error) {
    console.warn(error);
  }
}

console.log(JSON.stringify(info));
