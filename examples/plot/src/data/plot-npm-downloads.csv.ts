import {csvFormat} from "d3-dsv";
import {json} from "d3-fetch";
import {timeDay, utcDay} from "d3-time";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function load(project: string, start: Date, end: Date) {
  const data: any[] = [];
  let batchStart = end;
  let batchEnd;
  while (batchStart > start) {
    batchEnd = batchStart;
    batchStart = utcDay.offset(batchStart, -365);
    if (batchStart < start) batchStart = start;
    const batch = await json(
      `https://api.npmjs.org/downloads/range/${formatDate(batchStart)}:${formatDate(
        utcDay.offset(batchEnd, -1)
      )}/${project}`
    );
    for (const {downloads: value, day: date} of batch.downloads.reverse()) {
      data.push({date: new Date(date), value});
    }
  }

  // trim zeroes at both ends
  do {
    if (data[0].value === 0) data.shift();
    else if (data.at(-1)?.value !== 0) data.pop();
    else return data;
  } while (data.length);
  throw new Error("empty dataset");
}

process.stdout.write(csvFormat(await load("@observablehq/plot", new Date("2021-01-01"), utcDay(timeDay()))));
