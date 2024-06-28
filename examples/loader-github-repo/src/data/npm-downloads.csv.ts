import { csvFormat } from "d3-dsv";
import { timeDay, utcDay } from "d3-time";
import { utcFormat } from "d3-time-format";
import { github } from "./github.js";
import { getRepo } from "./github-repo.js";

const repo = await getRepo();
const { nameWithOwner, NPM_PACKAGE } = repo;

async function load(name) {
  const end = utcDay(timeDay()); // exclusive
  const data: any[] = [];
  const formatDate = utcFormat("%Y-%m-%d");
  const min = new Date("2021-01-01");
  let batchStart = end;
  let batchEnd;
  while (batchStart > min) {
    batchEnd = batchStart;
    batchStart = utcDay.offset(batchStart, -365);
    if (batchStart < min) batchStart = min;
    const url = `https://api.npmjs.org/downloads/range/${formatDate(
      batchStart
    )}:${formatDate(utcDay.offset(batchEnd, -1))}/${name}`;
    console.warn(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
    const batch = await response.json();
    for (const { downloads: value, day: date } of batch.downloads.reverse()) {
      data.push({ date: new Date(date), value });
    }
  }
  for (let i = data.length - 1; i >= 0; --i) {
    if (data[i].value > 0) {
      return data.slice(data[0].value > 0 ? 0 : 1, i + 1); // ignore npm reporting zero for today
    }
  }
  throw new Error("empty dataset");
}

let name = NPM_PACKAGE;
if (name === undefined) {
  const pck = await github(`/repos/${nameWithOwner}/contents/package.json`);
  ({ name } = JSON.parse(atob(pck.body.content)));
}
process.stdout.write(csvFormat(await load(name)));
