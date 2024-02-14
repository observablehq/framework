import {csvFormat} from "d3-dsv";
import {githubList} from "./github.js";

async function load(repo: string) {
  const stars: any[] = [];
  for await (const item of githubList(`/repos/${repo}/stargazers`, {accept: "application/vnd.github.star+json"})) {
    stars.push({starred_at: item.starred_at, login: item.user.login});
  }
  return stars;
}

process.stdout.write(csvFormat(await load("observablehq/plot")));
