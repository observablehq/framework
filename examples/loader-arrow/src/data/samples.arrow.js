import * as Arrow from "apache-arrow";

// Generate a daily random walk as parallel arrays of {date, value}.
const date = [];
const value = [];
const start = new Date("2022-01-01");
const end = new Date("2023-01-01");
for (let currentValue = 0, currentDate = start; currentDate < end; ) {
  date.push(currentDate);
  value.push(currentValue);
  (currentDate = new Date(currentDate)), currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  currentValue += Math.random() - 0.5;
}

// Construct an Apache Arrow table from the parallel arrays.
const table = Arrow.tableFromArrays({date, value});

// Output the Apache Arrow table as an IPC stream to stdout.
process.stdout.write(Arrow.tableToIPC(table));
