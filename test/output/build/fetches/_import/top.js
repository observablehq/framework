import {FileAttachment} from "../_observablehq/stdlib.js";
export {fooCsvData, fooJsonData} from "./foo/foo.js?sha=6fd063d5f14f3bb844cfdb599bf3bdd643c4d0f89841591f769960fd58104e6c";
export const topJsonData = await FileAttachment("../top-data.json", import.meta.url).json();
export const topCsvData = await FileAttachment("../top-data.csv", import.meta.url).text();
