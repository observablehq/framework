import { GITHUB_TOKEN, MAX_COMMITS } from "./config.js";

import type { Walker } from "isomorphic-git";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { fs } from "memfs";
import { getRepos } from "./github-repos.js";

const data: any[] = [];

const { repos } = await getRepos();

for (const { nameWithOwner: repo } of repos) {
  console.warn("analyzing", repo);
  try {
    data.push(await analyzeRepo(repo));
  } catch (error) {
    console.warn(error);
  }
}

console.log(JSON.stringify(data));

// https://isomorphic-git.org/docs/en/clone
async function analyzeRepo(repo: string): Promise<Object> {
  console.warn("cloning", `github.com/${repo}`);
  const dir = `/tmp/${repo}`;

  await git.clone({
    fs,
    http,
    dir,
    depth: MAX_COMMITS, // shallow clone
    noCheckout: true,
    singleBranch: true,
    noTags: true,
    onProgress: () => void process.stderr.write("."),
    url: `https://${GITHUB_TOKEN}@github.com/${repo}`,
  });

  console.warn("\nreading commits");
  const commits: Object[] = [];

  for (const { oid: id, commit, payload } of await git.log({
    fs,
    dir,
    depth: MAX_COMMITS,
    ref: "main",
  })) {
    let prev;
    try {
      const {
        message,
        author: { name: author },
        parent: [parentid],
      } = commit;
      process.stderr.write("+");
      const current = git.TREE({ ref: id });
      const parent =
        prev?.id === parentid ? prev.tree : git.TREE({ ref: parentid });
      commits.push({
        id,
        date: getDateFromPayload(payload),
        author,
        message,
        files: await getFileStateChanges(current, parent, dir),
      });
      prev = { id, tree: current };
    } catch (error) {
      break; // missing commit, we've reached the end of the shallow clone
    }
  }
  console.warn("!\n");

  return { repo, commits };
}

// git log --name-status
async function getFileStateChanges(
  current: Walker,
  parent: Walker,
  dir: string
) {
  const files: string[] = [];
  await git.walk({
    fs,
    dir,
    trees: [current, parent],
    map: async function (walker, [a1, a2]) {
      if ((await a1?.type()) === "blob") {
        const [o1, o2] = await Promise.all([a1?.oid(), a2?.oid()]);
        if (o1 === o2) return false;
        files.push(walker);
      }
      return true;
    },
  });

  return files;
}

function getDateFromPayload(payload: string): Date {
  const a = payload.match(/^author .* (\d{10}) [+-]?\d{4}$/m);
  return new Date(1000 * +(a?.[1] ?? NaN));
}
