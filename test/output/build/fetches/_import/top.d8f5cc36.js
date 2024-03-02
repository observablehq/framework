import {FileAttachment} from "../_observablehq/stdlib.js";
export {fooCsvData, fooJsonData} from "./foo/foo.6fd063d5.js";
export const topJsonData = await FileAttachment("../top-data.json", import.meta.url).json();
export const topCsvData = await FileAttachment("../top-data.csv", import.meta.url).text();
