import {csvFormat} from "d3-dsv";
import {timeDay, utcDay} from "d3-time";
import {utcFormat} from "d3-time-format";

async function load(project) {
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
    const response = await fetch(
      `https://api.npmjs.org/downloads/range/${formatDate(batchStart)}:${formatDate(
        utcDay.offset(batchEnd, -1)
      )}/${project}`
    );
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
    const batch = await response.json();
    for (const {downloads: value, day: date} of batch.downloads.reverse()) {
      data.push({date: new Date(date), value});
    }
  }

  // trim zeroes at both ends
  do {
    if (data[0].value === 0) data.shift();
    else if (data.at(-1).value !== 0) data.pop();
    else return data;
  } while (data.length);
  throw new Error("empty dataset");
}

process.stdout.write(csvFormat(await load("@observablehq/plot")));
