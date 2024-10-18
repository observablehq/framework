import {FileAttachment} from "../_observablehq/stdlib.00000003.js"/* observablehq-file */;
export {fooCsvData, fooJsonData} from "./foo/foo.666599bc.js"/* observablehq-file */;
export const topJsonData = await FileAttachment({"name":"../top-data.json","mimeType":"application/json","path":"../_file/top-data.67358ed8.json"/* observablehq-file */,"lastModified":/* ts */1706742000000,"size":10}, import.meta.url).json();
export const topCsvData = await FileAttachment({"name":"../top-data.csv","mimeType":"text/csv","path":"../_file/top-data.24ef4634.csv"/* observablehq-file */,"lastModified":/* ts */1706742000000,"size":72}, import.meta.url).text();
