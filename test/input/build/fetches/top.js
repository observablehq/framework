export { fooCsvData, fooJsonData } from "./foo/foo.js";
export const topJsonData = await fetch("./top-data.json").then(d => d.json());
export const topCsvData = await fetch("./top-data.csv").then(d => d.csv({ typed: true }));
