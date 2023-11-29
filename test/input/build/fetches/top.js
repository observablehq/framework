import { fooData } from "./foo/foo.js";

const topJsonData = await fetch("./top-data.json").then(d => d.json());
const topCsvData = await fetch("./top-data.csv").then(d => d.csv({ typed: true }));
