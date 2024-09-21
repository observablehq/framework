import {FileAttachment} from "observablehq:stdlib";
export {fooCsvData, fooJsonData} from "./foo/foo.js";
export const topJsonData = await FileAttachment("top-data.json").json();
export const topCsvData = await FileAttachment("top-data.csv").text();
