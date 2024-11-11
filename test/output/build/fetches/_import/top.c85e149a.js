import {FileAttachment} from "../_observablehq/stdlib.00000004.js";
export {fooCsvData, fooJsonData} from "./foo/foo.666599bc.js";
export const topJsonData = await FileAttachment({"name":"../top-data.json","mimeType":"application/json","path":"../_file/top-data.67358ed8.json","lastModified":/* ts */1706742000000,"size":10}, import.meta.url).json();
export const topCsvData = await FileAttachment({"name":"../top-data.csv","mimeType":"text/csv","path":"../_file/top-data.24ef4634.csv","lastModified":/* ts */1706742000000,"size":72}, import.meta.url).text();
