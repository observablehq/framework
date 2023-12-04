export {fooCsvData, fooJsonData} from "./foo/foo.js?sha=ed706415f035efdd17afdfeeb09a5ff51231b2a43553a47ae89a6bf03039b1ee";
export const topJsonData = await fetch(new URL("../_file/top-data.json", import.meta.url)).then(d => d.json());
export const topCsvData = await fetch(new URL("../_file/top-data.csv", import.meta.url)).then(d => d.text());
