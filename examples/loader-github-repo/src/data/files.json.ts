import {getRepo} from "./github-repo.js";
import {github} from "./github.js";

const repo = await getRepo();

const {
  nameWithOwner,
  defaultBranchRef: {name: branch}
} = repo;
console.warn("loading files for", nameWithOwner, branch);

const {body} = await github(`/repos/${nameWithOwner}/git/trees/${branch}?recursive=1`);

const tree = body.tree.map(({path, size}) => ({path, size}));

process.stdout.write(JSON.stringify(tree));
