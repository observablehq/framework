import {FileAttachment} from "../../_observablehq/stdlib.js";
export const fooJsonData = await FileAttachment("../../foo/foo-data.json", import.meta.url).json();
export const fooCsvData = await FileAttachment("../../foo/foo-data.csv", import.meta.url).text();
