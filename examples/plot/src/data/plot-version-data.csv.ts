import {csvFormat} from "d3-dsv";
import {json} from "d3-fetch";

async function load(project: string) {
  const {downloads} = await json(`https://api.npmjs.org/versions/${encodeURIComponent(project)}/last-week`);
  const info = await json(`https://registry.npmjs.org/${encodeURIComponent(project)}`);
  return Object.values(info.versions as {version: string}[])
    .map(({version}) => ({version, date: new Date(info.time[version]), downloads: downloads[version]}))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

process.stdout.write(csvFormat(await load("@observablehq/plot")));
