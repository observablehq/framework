import {githubList} from "./github.js";
import {csvFormat} from "d3-dsv";

const repo = "observablehq/plot";
const stars: any[] = [];
for await (const item of githubList(`/repos/${repo}/stargazers`, {accept: "application/vnd.github.star+json"}))
  stars.push({starred_at: item.starred_at, login: item.user.login});

process.stdout.write(csvFormat(stars));
