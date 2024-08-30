import { getRepos } from "./github-repos.js";

console.log(JSON.stringify(await getRepos()));
