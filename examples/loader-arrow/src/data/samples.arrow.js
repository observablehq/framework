import * as Arrow from "apache-arrow";

const date = [];
const value = [];
const start = new Date("2022-01-01");
const end = new Date("2023-01-01");
for (let d = new Date(start), v = 0; d < end; d.setUTCDate(d.getUTCDate() + 1)) {
  date.push(new Date(d));
  value.push((v += Math.random() - 0.5)); // random walk
}

const table = Arrow.tableFromArrays({date, value});

process.stdout.write(Arrow.tableToIPC(table));
