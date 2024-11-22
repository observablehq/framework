import {FileAttachment} from "../_observablehq/stdlib.00000003.js";
export {fooCsvData, fooJsonData} from "./foo/foo.0cc12e18.js";
export const topJsonData = await FileAttachment({"name":"../top-data.json","mimeType":"application/json","path":"../_file/top-data.67358ed8.json","lastModified":1704931200000,"size":10}, import.meta.url).json();
export const topCsvData = await FileAttachment({"name":"../top-data.csv","mimeType":"text/csv","path":"../_file/top-data.24ef4634.csv","lastModified":1704931200000,"size":72}, import.meta.url).text();
