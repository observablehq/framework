import { utcDay } from "d3-time";
import { githubList } from "./github.js";
import { getRepo } from "./github-repo.js";

const repo = await getRepo();

async function load() {
  process.stdout.write("[");
  let first = true;
  for await (const item of loadItems()) {
    if (first) first = false;
    else process.stdout.write(",");
    process.stdout.write(`\n  ${JSON.stringify(redactItem(item))}`);
  }
  process.stdout.write("\n]\n");
}

async function* loadItems() {
  const end = utcDay();
  const start = utcDay.offset(end, -28 * 6);
  const { nameWithOwner } = repo;
  for await (const item of githubList(
    `/repos/${nameWithOwner}/issues/comments?since=${start.toISOString()}&until=${end.toISOString()}`,
    { reverse: true }
  ))
    yield item;
}

function redactItem(item) {
  return {
    repo: item.repo,
    login: item.user.login,
    date: item.created_at,
    html_url: item.html_url,
    body: truncateBody(item.body),
  };
}

function truncateBody(body) {
  const line = body.split("\n")[0].trim();
  return line.length > 100 ? line.slice(0, 99) + "…" : line;
}

await load();
